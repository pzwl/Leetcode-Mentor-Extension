// Background service worker for the LeetCode AI Assistant extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('LeetCode AI Assistant installed');
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'testApiKey') {
        testApiConnection(request.provider, request.apiKey)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
    
    if (request.action === 'getChatResponse') {
        getChatbotResponse(request.provider, request.apiKey, request.messages)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
});

async function testApiConnection(provider, apiKey) {
    try {
        let response;
        
        switch (provider) {
            case 'openai':
                response = await fetch('https://api.openai.com/v1/models', {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                break;
                
            case 'claude':
                response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'test' }]
                    })
                });
                break;
                
            case 'gemini':
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: 'test' }] }]
                    })
                });
                break;
                
            default:
                throw new Error('Unsupported provider');
        }
        
        if (response.ok || (provider === 'claude' && response.status === 400)) {
            // Claude returns 400 for empty/test messages, but it means the API key is valid
            return { success: true };
        } else {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function getChatbotResponse(provider, apiKey, messages) {
    try {
        let response;
        
        switch (provider) {
            case 'openai':
                response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: messages,
                        max_tokens: 1000,
                        temperature: 0.7
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`OpenAI API Error: ${response.status}`);
                }
                
                const openaiData = await response.json();
                return {
                    success: true,
                    response: openaiData.choices[0].message.content
                };
                
            case 'claude':
                response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'Content-Type': 'application/json',
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 1000,
                        messages: messages
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Claude API Error: ${response.status}`);
                }
                
                const claudeData = await response.json();
                return {
                    success: true,
                    response: claudeData.content[0].text
                };
                
            case 'gemini':
                // Convert messages to Gemini format - Gemini doesn't support system messages in the same way
                // We'll combine system message with the first user message
                let geminiContents = [];
                let systemMessage = '';
                
                // Extract system message if present
                const systemMsg = messages.find(msg => msg.role === 'system');
                if (systemMsg) {
                    systemMessage = systemMsg.content + '\n\n';
                }
                
                // Convert user/assistant messages, skipping system messages
                for (let i = 0; i < messages.length; i++) {
                    const msg = messages[i];
                    if (msg.role === 'system') continue;
                    
                    if (msg.role === 'user') {
                        // If this is the first user message, prepend system message
                        const content = (i === 1 && systemMessage) ? systemMessage + msg.content : msg.content;
                        geminiContents.push({
                            role: 'user',
                            parts: [{ text: content }]
                        });
                    } else if (msg.role === 'assistant') {
                        geminiContents.push({
                            role: 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }
                
                response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: geminiContents
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Gemini API Error: ${response.status}`);
                }
                
                const geminiData = await response.json();
                return {
                    success: true,
                    response: geminiData.candidates[0].content.parts[0].text
                };
                
            default:
                throw new Error('Unsupported provider');
        }
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}
