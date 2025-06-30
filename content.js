// Content script that runs on LeetCode problem pages

let chatbotWindow = null;
let hasApiKey = false;
let selectedProvider = null;

// Initialize when the page loads
(async function init() {
    await checkApiConfiguration();
    createHelpButton();
    observePageChanges();
})();

async function checkApiConfiguration() {
    try {
        const result = await chrome.storage.sync.get(['apiKeys', 'selectedProvider']);
        const apiKeys = result.apiKeys || {};
        selectedProvider = result.selectedProvider;
        
        hasApiKey = selectedProvider && apiKeys[selectedProvider];
    } catch (error) {
        console.error('Error checking API configuration:', error);
        hasApiKey = false;
    }
}

function createHelpButton() {
    // Remove existing button if any
    const existingButton = document.getElementById('leetcode-ai-help-btn');
    if (existingButton) {
        existingButton.remove();
    }
    
    // Only show on problem pages
    if (!window.location.pathname.includes('/problems/')) {
        return;
    }
    
    const helpButton = document.createElement('div');
    helpButton.id = 'leetcode-ai-help-btn';
    helpButton.innerHTML = `
        <div class="ai-help-button">
            <span class="ai-text">Get AI Help</span>
        </div>
    `;
    
    helpButton.addEventListener('click', handleHelpButtonClick);
    document.body.appendChild(helpButton);
}

async function handleHelpButtonClick() {
    await checkApiConfiguration();
    
    if (!hasApiKey) {
        showApiKeyPrompt();
        return;
    }
    
    const problemData = extractProblemData();
    openChatbotWindow(problemData);
}

function showApiKeyPrompt() {
    const modal = document.createElement('div');
    modal.id = 'api-key-prompt-modal';
    modal.innerHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>AI Assistant Setup Required</h3>
                    <button class="close-btn" onclick="this.closest('#api-key-prompt-modal').remove()">×</button>
                </div>
                <div class="modal-body">
                    <p>To use the AI assistant, you need to configure an API key first.</p>
                    <div class="setup-steps">
                        <div class="step">
                            <span class="step-number">1</span>
                            <span>Click the extension icon in your browser toolbar</span>
                        </div>
                        <div class="step">
                            <span class="step-number">2</span>
                            <span>Add your API key for ChatGPT, Claude, or Gemini</span>
                        </div>
                        <div class="step">
                            <span class="step-number">3</span>
                            <span>Come back and click "Get AI Help" again</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="open-settings-btn" id="open-settings-btn">
                        Open Settings
                    </button>
                    <button class="cancel-btn" onclick="this.closest('#api-key-prompt-modal').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener for Open Settings button
    document.getElementById('open-settings-btn').addEventListener('click', () => {
        // Try to open extension popup
        if (chrome.action && chrome.action.openPopup) {
            chrome.action.openPopup();
        } else {
            // Fallback: show instruction to click extension icon
            alert('Please click the LeetCode AI extension icon in your browser toolbar to open settings.');
        }
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
            modal.remove();
        }
    });
}

function extractProblemData() {
    const data = {
        title: '',
        description: '',
        constraints: '',
        examples: [],
        code: '',
        language: ''
    };
    
    try {
        // Extract problem title
        const titleElement = document.querySelector('[data-cy="question-title"]') || 
                           document.querySelector('h1') ||
                           document.querySelector('.css-v3d350');
        if (titleElement) {
            data.title = titleElement.textContent.trim();
        }
        
        // Extract problem description
        const descriptionElement = document.querySelector('[data-track-load="description_content"]') ||
                                 document.querySelector('.content__u3I1 .question-content') ||
                                 document.querySelector('[class*="content"]');
        if (descriptionElement) {
            data.description = descriptionElement.textContent.trim();
        }
        
        // Extract current code from editor with improved methods
        console.log('=== Code Extraction Debug ===');
        
        // Try multiple selectors for the code editor
        const editorSelectors = [
            '.monaco-editor',
            '[data-mode-id]',
            '.cm-editor', // CodeMirror 6 (new LeetCode editor)
            '.cm-content', // CodeMirror 6 content area
            '.view-lines',
            'textarea[autocomplete="off"]',
            '[class*="monaco"]',
            '[class*="editor"]',
            '[class*="cm-"]'
        ];
        
        let codeEditor = null;
        for (const selector of editorSelectors) {
            codeEditor = document.querySelector(selector);
            if (codeEditor) {
                console.log(`Found code editor with selector: ${selector}`);
                break;
            }
        }
        
        if (codeEditor) {
            console.log('Code editor found:', codeEditor.className, codeEditor.tagName);
            
            // Method 1: Try Monaco API first (most reliable)
            if (window.monaco && window.monaco.editor) {
                try {
                    const editors = window.monaco.editor.getEditors();
                    console.log('Monaco editors found:', editors.length);
                    if (editors && editors.length > 0) {
                        const editorModel = editors[0].getModel();
                        if (editorModel) {
                            data.code = editorModel.getValue();
                            console.log('✅ SUCCESS: Extracted code via Monaco API');
                            console.log('Code length:', data.code.length);
                            console.log('Code preview:', data.code.substring(0, 100) + '...');
                        }
                    }
                } catch (e) {
                    console.log('Monaco API extraction failed:', e);
                }
            }
            
            // Method 2: Try CodeMirror 6 extraction (new LeetCode editor)
            if (!data.code || data.code.length < 10) {
                console.log('Trying CodeMirror extraction...');
                
                // Look for CodeMirror editor state
                if (codeEditor.classList.contains('cm-editor') || codeEditor.querySelector('.cm-content')) {
                    const cmContent = codeEditor.querySelector('.cm-content') || codeEditor;
                    
                    // Try to get the editor view from the DOM
                    if (cmContent && cmContent.cmView && cmContent.cmView.state) {
                        try {
                            data.code = cmContent.cmView.state.doc.toString();
                            console.log('✅ SUCCESS: Extracted code via CodeMirror state');
                            console.log('Code length:', data.code.length);
                            console.log('Code preview:', data.code.substring(0, 100) + '...');
                        } catch (e) {
                            console.log('CodeMirror state extraction failed:', e);
                        }
                    }
                    
                    // Fallback: try to extract from CodeMirror lines
                    if (!data.code || data.code.length < 10) {
                        const cmLines = cmContent.querySelectorAll('.cm-line');
                        if (cmLines.length > 0) {
                            const codeLines = [];
                            cmLines.forEach((line, lineIndex) => {
                                const lineText = line.textContent || line.innerText || '';
                                codeLines.push(lineText);
                                
                                if (lineIndex < 5) {
                                    console.log(`CM Line ${lineIndex + 1}: "${lineText}"`);
                                }
                            });
                            
                            if (codeLines.length > 0) {
                                data.code = codeLines.join('\n').trim();
                                console.log('✅ SUCCESS: Extracted code via CodeMirror lines');
                                console.log('Code length:', data.code.length);
                            }
                        }
                    }
                }
            }
            
            // Method 3: Try view-lines extraction (Monaco legacy)
            if (!data.code || data.code.length < 10) {
                console.log('Trying view-lines extraction...');
                const viewLines = codeEditor.querySelector('.view-lines') || codeEditor;
                if (viewLines) {
                    const lines = viewLines.querySelectorAll('.view-line');
                    console.log(`Found ${lines.length} view lines`);
                    
                    const codeLines = [];
                    lines.forEach((line, lineIndex) => {
                        // Try different methods to get line text
                        let lineText = '';
                        
                        // Method A: Get text from spans
                        const spans = line.querySelectorAll('span');
                        if (spans.length > 0) {
                            spans.forEach(span => {
                                const spanText = span.textContent || span.innerText || '';
                                lineText += spanText;
                            });
                        } else {
                            // Method B: Get line text directly
                            lineText = line.textContent || line.innerText || '';
                        }
                        
                        codeLines.push(lineText);
                        
                        // Debug first few lines
                        if (lineIndex < 5) {
                            console.log(`Line ${lineIndex + 1}: "${lineText}"`);
                        }
                    });
                    
                    if (codeLines.length > 0) {
                        data.code = codeLines.join('\n').trim();
                        console.log('✅ SUCCESS: Extracted code via view-lines');
                        console.log('Code length:', data.code.length);
                    }
                }
            }
            
            // Method 4: Try textarea (if it's a textarea)
            if ((!data.code || data.code.length < 10) && codeEditor.tagName === 'TEXTAREA') {
                console.log('Trying textarea extraction...');
                data.code = codeEditor.value;
                if (data.code && data.code.length > 0) {
                    console.log('✅ SUCCESS: Extracted code from textarea');
                    console.log('Code length:', data.code.length);
                }
            }
            
            // Method 5: Try direct text content (last resort - but filter out test data)
            if (!data.code || data.code.length < 10) {
                console.log('Trying direct text content extraction...');
                let textContent = codeEditor.textContent || codeEditor.innerText || '';
                
                // Filter out obvious test case data (arrays, numbers in brackets)
                if (textContent && textContent.length > 10) {
                    // Check if this looks like test data vs actual code
                    const hasCodeKeywords = /\b(class|public|private|int|void|return|if|for|while)\b/i.test(textContent);
                    const looksLikeTestData = /^\d+[›]?\[\[.*\]\]/.test(textContent.trim());
                    
                    if (hasCodeKeywords && !looksLikeTestData) {
                        data.code = textContent;
                        console.log('✅ SUCCESS: Extracted code via text content');
                        console.log('Code length:', data.code.length);
                    } else {
                        console.log('❌ Text content looks like test data, skipping:', textContent.substring(0, 50));
                    }
                }
            }
            
            // Method 6: Look for hidden input or alternative code storage
            if (!data.code || data.code.length < 10) {
                console.log('Trying alternative code extraction methods...');
                
                // Look for hidden textarea or input with code
                const hiddenInputs = document.querySelectorAll('textarea, input[type="hidden"]');
                for (const input of hiddenInputs) {
                    const value = input.value || '';
                    if (value.length > 20 && /class.*{/.test(value)) {
                        data.code = value;
                        console.log('✅ SUCCESS: Found code in hidden input');
                        console.log('Code length:', data.code.length);
                        break;
                    }
                }
                
                // Try to find any element containing code-like text
                if (!data.code || data.code.length < 10) {
                    const codeElements = document.querySelectorAll('[class*="code"], [class*="editor"], .cm-line');
                    for (const element of codeElements) {
                        const text = element.textContent || '';
                        if (text.includes('class Solution') || (text.includes('class') && text.includes('{'))) {
                            const lines = [];
                            element.querySelectorAll('.cm-line, .view-line').forEach(line => {
                                lines.push(line.textContent || '');
                            });
                            
                            if (lines.length > 0) {
                                data.code = lines.join('\n').trim();
                                console.log('✅ SUCCESS: Found code in code element');
                                console.log('Code length:', data.code.length);
                                break;
                            }
                        }
                    }
                }
            }
            
            // Final cleanup and filtering
            if (data.code) {
                data.code = data.code.trim();
                
                console.log('Raw extracted code before filtering:', data.code.substring(0, 200));
                
                // Filter to extract only LeetCode solution class
                data.code = extractLeetCodeSolution(data.code);
                
                console.log('Final extracted code after filtering:', data.code.substring(0, 200));
            } else {
                console.log('❌ FAILED: No code could be extracted');
            }
        } else {
            console.log('❌ No code editor found on page');
        }
        
        // Try to detect programming language
        const languageSelector = document.querySelector('[data-cy="lang-select"]') ||
                               document.querySelector('button[id*="headlessui-listbox-button"]');
        if (languageSelector) {
            data.language = languageSelector.textContent.trim();
        }
        
        // If we couldn't get the description, try alternative selectors
        if (!data.description) {
            const contentArea = document.querySelector('.question-content') ||
                              document.querySelector('[data-cy="question-detail-main-tabs"]') ||
                              document.querySelector('.elfjS');
            if (contentArea) {
                data.description = contentArea.textContent.trim();
            }
        }
        
    } catch (error) {
        console.error('Error extracting problem data:', error);
    }
    
    return data;
}

// Function to extract only the LeetCode solution class from the code
function extractLeetCodeSolution(code) {
    if (!code || code.length < 10) {
        return code;
    }
    
    console.log('=== Solution Extraction Debug ===');
    console.log('Input code preview:', code.substring(0, 200));
    
    // First, try to clean up any malformed HTML or artifacts
    let cleanCode = code
        .replace(/class=class="token string">"token comment">/g, '') // Remove malformed HTML
        .replace(/class=class="token[^"]*"[^>]*>/g, '') // Remove token class artifacts
        .replace(/<[^>]*>/g, '') // Remove any HTML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/>\s*\/\/\s*/g, ' // ') // Fix comment spacing
        .replace(/\s{4,}/g, '    ') // Normalize excessive spacing to 4 spaces max
        .replace(/\n{3,}/g, '\n\n'); // Remove excessive line breaks

    // Split code into lines
    const lines = cleanCode.split('\n');
    let solutionLines = [];
    let insideSolutionClass = false;
    let braceCount = 0;
    let solutionStartFound = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const originalLine = lines[i]; // Preserve original indentation
        
        // Skip empty lines, includes, using namespace, and main function
        if (line === '' || 
            line.startsWith('#include') || 
            line.startsWith('using namespace') ||
            line.startsWith('int main') ||
            line.includes('int main(') ||
            line.startsWith('//') ||
            line.includes('Output:') ||
            line.includes('cout <<') ||
            line.includes('printf(') ||
            line.includes('std::cout')) {
            continue;
        }
        
        // Look for Solution class start
        if (line.includes('class Solution') || line.includes('class solution')) {
            solutionStartFound = true;
            insideSolutionClass = true;
            solutionLines.push(originalLine);
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;
            continue;
        }
        
        // If we're inside the Solution class
        if (insideSolutionClass) {
            solutionLines.push(originalLine);
            braceCount += (line.match(/\{/g) || []).length;
            braceCount -= (line.match(/\}/g) || []).length;
            
            // If we've closed all braces, we're done with the Solution class
            if (braceCount <= 0) {
                break;
            }
        }
    }
    
    // If we found a solution class, return it
    if (solutionStartFound && solutionLines.length > 0) {
        const filteredCode = solutionLines.join('\n').trim();
        console.log('✅ Found Solution class - extracted', solutionLines.length, 'lines');
        console.log('Filtered code preview:', filteredCode.substring(0, 200));
        return filteredCode;
    }
    
    // If no Solution class found, return cleaned original code
    console.log('❌ No Solution class found, returning cleaned original code');
    console.log('Cleaned code preview:', cleanCode.substring(0, 200));
    return cleanCode.trim();
}

function openChatbotWindow(problemData) {
    // Remove existing chatbot if any
    if (chatbotWindow) {
        chatbotWindow.remove();
    }
    
    // Hide the "Get AI Help" button
    const helpButton = document.getElementById('leetcode-ai-help-btn');
    if (helpButton) {
        helpButton.style.display = 'none';
    }
    
    chatbotWindow = document.createElement('div');
    chatbotWindow.id = 'leetcode-ai-chatbot';
    chatbotWindow.innerHTML = `
        <div class="chatbot-container">
            <div class="chatbot-header">
                <div class="chatbot-title">
                    <span>AI Assistant</span>
                    <span class="provider-badge">${getProviderName(selectedProvider)}</span>
                </div>
                <div class="chatbot-controls">
                    <button class="fullscreen-btn" id="fullscreen-btn" title="Toggle Fullscreen">⛶</button>
                    <button class="minimize-btn" id="minimize-btn" title="Minimize">−</button>
                    <button class="close-btn" id="close-btn" title="Close">×</button>
                </div>
            </div>
            <div class="chatbot-content">
                <div class="messages-container" id="messages-container">
                    <div class="message ai-message">
                        <div class="message-content">
                            <p>Hi! I'm here to help you with this LeetCode problem: <strong>"${problemData.title}"</strong></p>
                            <p>I can help you with:</p>
                            <ul>
                                <li>Understanding the problem</li>
                                <li>Explaining algorithms and approaches</li>
                                <li>Reviewing your code</li>
                                <li>Debugging issues</li>
                                <li>Optimizing solutions</li>
                            </ul>
                            <div class="keyboard-shortcuts">
                                <small><strong>Keyboard Shortcuts:</strong> F11 (Fullscreen) | Esc (Exit/Minimize) | Ctrl+M (Minimize)</small>
                            </div>
                            <p>What would you like help with?</p>
                        </div>
                    </div>
                </div>
                <div class="input-container">
                    <div class="quick-actions">
                        <button class="quick-action" data-message="Explain this problem step by step with examples">
                            Explain Problem
                        </button>
                        <button class="quick-action" data-message="Am I on the right track with my current approach? Please review my code and give me feedback on my logic, but don't give me the complete solution.">
                            Review My Approach
                        </button>
                        <button class="quick-action" data-message="What algorithm or data structure should I consider for this problem? Give me hints about the approach, but let me implement it myself.">
                            Get Hints
                        </button>
                        <button class="quick-action" data-message="I'm stuck. Can you help me debug my current code and point out what's wrong, but let me fix it myself?">
                            Help Debug
                        </button>
                    </div>
                    <div class="input-row">
                        <textarea id="user-input" placeholder="Ask me anything about this problem..." rows="2"></textarea>
                        <button id="send-btn">Send</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(chatbotWindow);
    
    // Store problem data for context
    chatbotWindow.problemData = problemData;
    chatbotWindow.conversationHistory = [];
    
    // Setup event listeners
    setupChatbotEventListeners();
    
    // Focus on input and scroll to bottom
    document.getElementById('user-input').focus();
    
    // Ensure we scroll to bottom after the initial message
    setTimeout(() => {
        scrollToBottom();
    }, 100);
}

function setupChatbotEventListeners() {
    // Send button
    const sendBtn = document.getElementById('send-btn');
    const userInput = document.getElementById('user-input');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
    } else {
        console.error('Send button not found during setup');
    }
    
    // Enter key listener for textarea
    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    } else {
        console.error('User input not found during setup');
    }
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Only handle shortcuts when chatbot is open
        if (!chatbotWindow) return;
        
        // F11 or F for fullscreen toggle
        if (e.key === 'F11' || (e.key === 'f' && e.ctrlKey)) {
            e.preventDefault();
            toggleFullscreen();
        }
        
        // Escape to close fullscreen or minimize
        if (e.key === 'Escape') {
            if (chatbotWindow.classList.contains('fullscreen')) {
                e.preventDefault();
                toggleFullscreen();
            } else {
                e.preventDefault();
                toggleChatbot();
            }
        }
        
        // Ctrl+M to minimize/maximize
        if (e.key === 'm' && e.ctrlKey) {
            e.preventDefault();
            toggleChatbot();
        }
    });
    
    // Quick action buttons
    document.querySelectorAll('.quick-action').forEach(button => {
        button.addEventListener('click', (e) => {
            const message = e.target.getAttribute('data-message');
            if (message) {
                sendQuickMessage(message);
            }
        });
    });
    
    // Fullscreen button
    document.getElementById('fullscreen-btn').addEventListener('click', toggleFullscreen);
    
    // Minimize button
    document.getElementById('minimize-btn').addEventListener('click', toggleChatbot);
    
    // Close button
    document.getElementById('close-btn').addEventListener('click', closeChatbot);
}

function getProviderName(provider) {
    const names = {
        'openai': 'ChatGPT',
        'claude': 'Claude',
        'gemini': 'Gemini'
    };
    return names[provider] || provider;
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (!input || !sendBtn) {
        console.error('Input or send button not found');
        return;
    }
    
    const message = input.value.trim();
    
    if (!message) return;
    
    // Disable send button during processing
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';
    
    // Add user message to chat
    addMessageToChat('user', message);
    input.value = '';
    
    // Show typing indicator
    const typingIndicator = addMessageToChat('ai', 'Thinking...', 'typing');
    
    try {
        // Prepare context for AI
        const context = prepareProblemContext();
        const messages = [
            {
                role: 'system',
                content: `You are an expert coding mentor specialized in LeetCode problems. Your goal is to GUIDE and TEACH, not to give away solutions.

**CORE PRINCIPLES:**
1. **Be a Mentor, Not a Solution Provider**: Help users learn by guiding them, not by giving complete answers
2. **Encourage Learning**: Point out what they're doing right and gently guide them toward improvements
3. **Ask Guiding Questions**: Help them think through problems rather than solving for them
4. **Preserve Learning Journey**: Let them struggle productively and discover solutions themselves

**RESPONSE GUIDELINES:**

**For General Questions (like "Am I doing this right?" or "Review my code"):**
- ✅ Analyze their approach and logic
- ✅ Point out what's working well
- ✅ Identify specific issues or inefficiencies 
- ✅ Ask guiding questions to help them think
- ✅ Give hints about the right direction
- ❌ DO NOT provide complete corrected code
- ❌ DO NOT give away the full solution

**For Specific Help Requests (like "I'm stuck" or "How do I optimize this?"):**
- ✅ Provide targeted hints and suggestions
- ✅ Explain concepts and approaches
- ✅ Show small code snippets for specific techniques (not full solutions)
- ✅ Guide them step by step

**Only Provide Complete Code When:**
- User explicitly asks for "the complete solution" or "show me the correct code"
- User has been struggling and specifically requests the full implementation
- User asks to "solve this problem for me"

**Code Format (when showing code):**
- Use \`\`\`cpp (or appropriate language) for code blocks
- Follow LeetCode class format: class Solution { public: ... };
- NO #include headers, NO main functions, NO test cases
- Preserve user's variable names and style when possible

**Example Responses:**
- "Your approach with sorting is on the right track! However, I notice you're not handling overlapping intervals correctly. What do you think happens when two trips overlap? Try thinking about..."
- "Good use of a map! The key insight you're missing is... Can you think of how to handle the timing aspect?"
- "Your logic is close, but there's an edge case. What happens when passengers get off at the same location others get on?"

Current Problem Context:
${context}

Remember: Your role is to GUIDE and TEACH, not to solve. Help them learn by thinking through the problem themselves!`
            },
            ...chatbotWindow.conversationHistory,
            {
                role: 'user',
                content: message
            }
        ];
        
        // Get AI response
        const result = await chrome.storage.sync.get(['apiKeys', 'selectedProvider']);
        const apiKey = result.apiKeys[selectedProvider];
        
        const response = await chrome.runtime.sendMessage({
            action: 'getChatResponse',
            provider: selectedProvider,
            apiKey: apiKey,
            messages: messages
        });
        
        // Remove typing indicator
        typingIndicator.remove();
        
        if (response.success) {
            // Clean the AI response from any malformed HTML artifacts
            const cleanedResponse = cleanAIResponse(response.response);
            
            addMessageToChat('ai', cleanedResponse);
            
            // Update conversation history
            chatbotWindow.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: cleanedResponse }
            );
            
            // Keep only last 10 messages to avoid token limits
            if (chatbotWindow.conversationHistory.length > 20) {
                chatbotWindow.conversationHistory = chatbotWindow.conversationHistory.slice(-20);
            }
        } else {
            addMessageToChat('ai', `Sorry, I encountered an error: ${response.error}`, 'error');
        }
        
    } catch (error) {
        typingIndicator.remove();
        addMessageToChat('ai', 'Sorry, I encountered an error while processing your request.', 'error');
        console.error('Chat error:', error);
    } finally {
        // Re-enable send button
        const sendBtn = document.getElementById('send-btn');
        const inputContainer = document.querySelector('.input-container');
        const chatbotContent = document.querySelector('.chatbot-content');
        const userInput = document.getElementById('user-input');
        
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.textContent = 'Send';
        }
        
        // Ensure chatbot content is visible
        if (chatbotContent) {
            chatbotContent.style.display = 'flex';
        }
        
        // Ensure input container is visible
        if (inputContainer) {
            inputContainer.style.display = 'block';
            inputContainer.style.visibility = 'visible';
        }
        
        // Focus back on input
        if (userInput) {
            setTimeout(() => {
                userInput.focus();
            }, 100);
        }
        
        // Ensure everything is visible
        setTimeout(() => {
            ensureInputVisible();
        }, 200);
    }
}

function sendQuickMessage(message) {
    const input = document.getElementById('user-input');
    input.value = message;
    input.focus();
    // Auto-send the message
    sendMessage();
}

function addMessageToChat(sender, content, type = '') {
    const container = document.getElementById('messages-container');
    if (!container) return null;
    
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${sender}-message ${type}`;
    messageDiv.innerHTML = `
        <div class="message-content">
            ${type === 'typing' ? content : formatMessage(content)}
        </div>
    `;
    
    container.appendChild(messageDiv);
    
    // Add event listeners for copy buttons in the new message
    const copyButtons = messageDiv.querySelectorAll('.copy-code-btn');
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const encodedCode = this.getAttribute('data-code');
            
            try {
                // Decode the base64 encoded code
                const code = decodeURIComponent(escape(atob(encodedCode)));
                copyToClipboard(code, this);
            } catch (error) {
                console.error('Error decoding code:', error);
                // Fallback: try to copy the encoded text as-is
                copyToClipboard(encodedCode, this);
            }
        });
    });
    
    // Scroll to bottom
    scrollToBottom();
    
    return messageDiv;
}

function scrollToBottom() {
    const container = document.getElementById('messages-container');
    if (!container) {
        return;
    }
    
    // Multiple approaches to ensure scrolling works
    container.scrollTop = container.scrollHeight;
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 50);
    
    setTimeout(() => {
        container.scrollTop = container.scrollHeight;
    }, 200);
}

function ensureInputVisible() {
    const inputContainer = document.querySelector('.input-container');
    const chatbotContent = document.querySelector('.chatbot-content');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    
    if (chatbotContent) {
        chatbotContent.style.display = 'flex';
        chatbotContent.style.visibility = 'visible';
    }
    
    if (inputContainer) {
        inputContainer.style.display = 'block';
        inputContainer.style.visibility = 'visible';
        inputContainer.style.opacity = '1';
    }
    
    if (userInput) {
        userInput.style.display = 'block';
        userInput.style.visibility = 'visible';
    }
    
    if (sendBtn) {
        sendBtn.style.display = 'block';
        sendBtn.style.visibility = 'visible';
    }
}

function formatMessage(content) {
    // Enhanced formatting with custom syntax highlighting
    let formatted = content;
    
    // Handle code blocks first (```language or just ```)
    formatted = formatted.replace(/```(\w+)?\n?([\s\S]*?)```/g, (match, language, code) => {
        const lang = language || 'cpp'; // Default to C++ for LeetCode
        const trimmedCode = code.trim();
        
        // Use custom syntax highlighting if available
        let highlightedCode = escapeHtml(trimmedCode);
        if (window.CustomHighlighter && window.CustomHighlighter.languages[lang]) {
            try {
                highlightedCode = window.CustomHighlighter.highlight(trimmedCode, lang);
            } catch (e) {
                // Fallback: create line structure manually
                const lines = trimmedCode.split('\n');
                highlightedCode = lines.map((line, index) => {
                    const lineNumber = index + 1;
                    return `<div class="code-line">
                        <span class="line-number">${lineNumber}</span>
                        <span class="line-content">${escapeHtml(line) || ' '}</span>
                    </div>`;
                }).join('');
            }
        } else {
            // Fallback: create line structure manually without highlighting
            const lines = trimmedCode.split('\n');
            highlightedCode = lines.map((line, index) => {
                const lineNumber = index + 1;
                return `<div class="code-line">
                    <span class="line-number">${lineNumber}</span>
                    <span class="line-content">${escapeHtml(line) || ' '}</span>
                </div>`;
            }).join('');
        }
        
        return `<div class="code-block-container">
            <div class="code-block-header">
                <div class="code-header-left">
                    <span class="code-language">${lang.toUpperCase()}</span>
                    <span class="code-label">Code</span>
                </div>
                <button class="copy-code-btn" data-code="${escapeForJs(trimmedCode)}">
                    Copy code
                </button>
            </div>
            <div class="code-block">${highlightedCode}</div>
        </div>`;
    });
    
    // Handle inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Handle bold and italic
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Handle line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

// Simple but effective syntax highlighting function
// Simple HTML escaping function
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeForJs(text) {
    // Store code as base64 to avoid any escaping issues
    return btoa(unescape(encodeURIComponent(text)));
}

// Simple copy to clipboard functionality like ChatGPT
function copyToClipboard(text, button) {
    // Ensure we have clean text without HTML entities
    const cleanText = text.trim();
    
    if (!cleanText) {
        console.error('No text to copy');
        return;
    }
    
    console.log('Copying text (first 100 chars):', cleanText.substring(0, 100));
    
    navigator.clipboard.writeText(cleanText).then(() => {
        // Simple success feedback - change button text temporarily
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = '#4caf50';
        button.disabled = true;
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
            button.disabled = false;
        }, 2000);
        
    }).catch(err => {
        console.error('Failed to copy: ', err);
        
        // Fallback: try the old school way
        try {
            const textarea = document.createElement('textarea');
            textarea.value = cleanText;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            
            if (success) {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.background = '#4caf50';
                button.disabled = true;
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.background = '';
                    button.disabled = false;
                }, 2000);
            } else {
                throw new Error('execCommand failed');
            }
        } catch (fallbackErr) {
            console.error('Fallback copy also failed:', fallbackErr);
            
            // Simple error feedback
            const originalText = button.textContent;
            button.textContent = 'Copy failed';
            button.style.background = '#f44336';
            
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 2000);
        }
    });
}

function prepareProblemContext() {
    const data = chatbotWindow.problemData;
    let context = '';
    
    if (data.title) {
        context += `Problem: ${data.title}\n\n`;
    }
    
    if (data.description && data.description.length > 50) {
        // Truncate very long descriptions but keep essential info
        const shortDesc = data.description.length > 1000 
            ? data.description.substring(0, 1000) + "..." 
            : data.description;
        context += `Problem Description:\n${shortDesc}\n\n`;
    }
    
    if (data.language) {
        context += `Programming Language: ${data.language}\n\n`;
    }
    
    if (data.code && data.code.trim()) {
        context += `User's Current Code:\n\`\`\`${data.language?.toLowerCase() || 'cpp'}\n${data.code}\n\`\`\`\n\n`;
        
        // Analyze the code to provide better context
        const codeAnalysis = analyzeUserCode(data.code);
        if (codeAnalysis) {
            context += `Code Analysis:\n${codeAnalysis}\n\n`;
        }
    } else {
        context += `Note: User hasn't written any code yet or code extraction failed.\n\n`;
    }
    
    context += `Instructions: 
- Preserve user's variable names and coding style when suggesting improvements
- Use proper code blocks with language specification for all code
- Make minimal changes to existing code structure
- Explain the reasoning behind each suggestion
- Focus on the specific approach the user is taking`;
    
    return context;
}

function analyzeUserCode(code) {
    if (!code || code.trim().length < 10) return null;
    
    let analysis = [];
    
    // Detect programming patterns
    if (code.includes('vector') || code.includes('array')) {
        analysis.push("- Uses array/vector data structure");
    }
    if (code.includes('map') || code.includes('HashMap') || code.includes('dict')) {
        analysis.push("- Uses hash map/dictionary for lookups");
    }
    if (code.includes('for') && code.includes('for')) {
        analysis.push("- Contains nested loops (possible O(n²) complexity)");
    }
    if (code.includes('sort') || code.includes('Sort')) {
        analysis.push("- Includes sorting operation");
    }
    if (code.includes('recursive') || (code.includes('return') && code.includes('function'))) {
        analysis.push("- May use recursive approach");
    }
    
    // Detect common variable patterns
    const variableMatches = code.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
    if (variableMatches) {
        const uniqueVars = [...new Set(variableMatches)]
            .filter(v => v.length > 1 && !['if', 'for', 'while', 'int', 'return', 'class', 'public', 'private'].includes(v))
            .slice(0, 5);
        if (uniqueVars.length > 0) {
            analysis.push(`- Key variables: ${uniqueVars.join(', ')}`);
        }
    }
    
    return analysis.length > 0 ? analysis.join('\n') : null;
}

function toggleFullscreen() {
    if (!chatbotWindow) return;
    
    const isFullscreen = chatbotWindow.classList.contains('fullscreen');
    const fullscreenBtn = chatbotWindow.querySelector('.fullscreen-btn');
    const messagesContainer = document.getElementById('messages-container');
    
    if (isFullscreen) {
        // Exit fullscreen
        chatbotWindow.classList.remove('fullscreen');
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = 'Toggle Fullscreen';
        
        // Reset messages container height
        if (messagesContainer) {
            messagesContainer.style.maxHeight = '350px';
            messagesContainer.style.height = 'auto';
        }
    } else {
        // Enter fullscreen
        chatbotWindow.classList.add('fullscreen');
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = 'Exit Fullscreen';
        
        // Adjust messages container for fullscreen
        if (messagesContainer) {
            messagesContainer.style.maxHeight = 'calc(100vh - 200px)';
            messagesContainer.style.height = 'calc(100vh - 200px)';
        }
        
        // Hide the "Get AI Help" button when in fullscreen
        const helpButton = document.getElementById('leetcode-ai-help-btn');
        if (helpButton) {
            helpButton.style.display = 'none';
        }
    }
    
    // Scroll to bottom after transition
    setTimeout(() => {
        scrollToBottom();
    }, 300);
}

function toggleChatbot() {
    if (!chatbotWindow) return;
    
    const content = chatbotWindow.querySelector('.chatbot-content');
    const btn = chatbotWindow.querySelector('.minimize-btn');
    
    if (!content || !btn) return;
    
    const isMinimized = content.style.display === 'none';
    
    if (isMinimized) {
        // Show chatbot (expand)
        content.style.display = 'flex';
        content.style.visibility = 'visible';
        btn.textContent = '−';
        chatbotWindow.classList.remove('minimized');
        
        // Hide the "Get AI Help" button when expanded
        const helpButton = document.getElementById('leetcode-ai-help-btn');
        if (helpButton) {
            helpButton.style.display = 'none';
        }
        
        // Ensure input container is visible after expanding
        setTimeout(() => {
            const inputContainer = document.querySelector('.input-container');
            if (inputContainer) {
                inputContainer.style.display = 'block';
                inputContainer.style.visibility = 'visible';
            }
            scrollToBottom();
        }, 100);
    } else {
        // Hide chatbot (minimize) - only hide the content, not remove it
        content.style.display = 'none';
        btn.textContent = '+';
        chatbotWindow.classList.add('minimized');
        
        // Show the "Get AI Help" button when minimized
        const helpButton = document.getElementById('leetcode-ai-help-btn');
        if (helpButton) {
            helpButton.style.display = 'block';
        }
    }
}

function closeChatbot() {
    if (chatbotWindow) {
        // Exit fullscreen if active
        if (chatbotWindow.classList.contains('fullscreen')) {
            chatbotWindow.classList.remove('fullscreen');
        }
        
        // Add closing animation class
        chatbotWindow.classList.add('chatbot-closing');
        
        setTimeout(() => {
            if (chatbotWindow) {
                chatbotWindow.remove();
                chatbotWindow = null;
            }
            
            // Show the "Get AI Help" button again
            const helpButton = document.getElementById('leetcode-ai-help-btn');
            if (helpButton) {
                helpButton.style.display = 'block';
            }
        }, 300);
    }
}

// Make functions globally available for backwards compatibility
window.toggleChatbot = toggleChatbot;
window.toggleFullscreen = toggleFullscreen;
window.closeChatbot = closeChatbot;
window.sendMessage = sendMessage;
window.sendQuickMessage = sendQuickMessage;

function observePageChanges() {
    // Watch for page navigation
    let currentPath = window.location.pathname;
    
    const observer = new MutationObserver(() => {
        if (window.location.pathname !== currentPath) {
            currentPath = window.location.pathname;
            setTimeout(() => {
                checkApiConfiguration();
                createHelpButton();
            }, 1000);
        }
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // Also listen for popstate events
    window.addEventListener('popstate', () => {
        setTimeout(() => {
            checkApiConfiguration();
            createHelpButton();
        }, 1000);
    });
}

// Function to clean AI response before formatting
function cleanAIResponse(response) {
    // Remove any malformed HTML artifacts that might come from the AI
    let cleaned = response
        .replace(/class=class="token[^"]*"[^>]*>/g, '') // Remove malformed class attributes
        .replace(/>\s*class="token[^"]*"[^>]*>/g, '>') // Remove orphaned class attributes
        .replace(/class="token[^"]*"[^>]*>/g, '') // Remove any remaining token class artifacts
        .replace(/&lt;span[^&]*&gt;/g, '') // Remove escaped span tags
        .replace(/&lt;\/span&gt;/g, '') // Remove escaped closing span tags
        .replace(/class=class="token string">"token comment">\s*>/g, '') // Remove specific malformed pattern
        .replace(/class=class="token string">"token comment">/g, '') // Remove specific malformed pattern
        .replace(/>\s*\/\/\s*/g, ' // ') // Fix comment spacing
        .replace(/\n\n\n+/g, '\n\n'); // Remove excessive line breaks
    
    return cleaned;
}
