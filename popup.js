// Popup JavaScript for managing API keys and settings

document.addEventListener('DOMContentLoaded', async () => {
    await loadSavedSettings();
    setupEventListeners();
});

function setupEventListeners() {
    // Setup save button listeners
    document.querySelectorAll('.save-btn').forEach((btn, index) => {
        const providers = ['openai', 'claude', 'gemini'];
        btn.addEventListener('click', () => saveApiKey(providers[index]));
    });
    
    // Setup test button listeners
    document.querySelectorAll('.test-btn').forEach((btn, index) => {
        const providers = ['openai', 'claude', 'gemini'];
        btn.addEventListener('click', () => testApiKey(providers[index]));
    });
    
    // Setup clear button listeners
    document.querySelectorAll('.clear-btn').forEach((btn, index) => {
        const providers = ['openai', 'claude', 'gemini'];
        btn.addEventListener('click', () => clearApiKey(providers[index]));
    });
}

async function loadSavedSettings() {
    try {
        const result = await chrome.storage.sync.get(['apiKeys', 'selectedProvider']);
        const apiKeys = result.apiKeys || {};
        const selectedProvider = result.selectedProvider;
        
        // Load saved API keys and update UI
        for (const [provider, key] of Object.entries(apiKeys)) {
            if (key) {
                document.getElementById(`${provider}-key`).value = '••••••••••••••••';
                updateProviderStatus(provider, 'connected');
            }
        }
        
        // Set selected provider
        if (selectedProvider) {
            document.getElementById(`${selectedProvider}-radio`).checked = true;
            document.getElementById(`${selectedProvider}-provider`).classList.add('active');
        }
        
        // Add event listeners for radio buttons
        document.querySelectorAll('input[name="provider"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                document.querySelectorAll('.api-provider').forEach(p => p.classList.remove('active'));
                document.getElementById(`${e.target.value}-provider`).classList.add('active');
                chrome.storage.sync.set({ selectedProvider: e.target.value });
            });
        });
        
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveApiKey(provider) {
    console.log('saveApiKey called for provider:', provider);
    const keyInput = document.getElementById(`${provider}-key`);
    const apiKey = keyInput.value.trim();
    
    if (!apiKey || apiKey === '••••••••••••••••') {
        showNotification('Please enter a valid API key', 'error');
        return;
    }
    
    try {
        const result = await chrome.storage.sync.get(['apiKeys']);
        const apiKeys = result.apiKeys || {};
        apiKeys[provider] = apiKey;
        
        await chrome.storage.sync.set({ apiKeys });
        
        keyInput.value = '••••••••••••••••';
        updateProviderStatus(provider, 'connected');
        showNotification(`${getProviderName(provider)} API key saved successfully!`, 'success');
        
        // Auto-select this provider if it's the first one configured
        const hasOtherKeys = Object.keys(apiKeys).some(p => p !== provider && apiKeys[p]);
        if (!hasOtherKeys || !document.querySelector('input[name="provider"]:checked')) {
            document.getElementById(`${provider}-radio`).checked = true;
            document.querySelectorAll('.api-provider').forEach(p => p.classList.remove('active'));
            document.getElementById(`${provider}-provider`).classList.add('active');
            await chrome.storage.sync.set({ selectedProvider: provider });
        }
        
    } catch (error) {
        console.error('Error saving API key:', error);
        showNotification('Error saving API key', 'error');
    }
}

async function testApiKey(provider) {
    console.log('testApiKey called for provider:', provider);
    // Find the correct test button for this provider
    const testButtons = document.querySelectorAll('.test-btn');
    const providers = ['openai', 'claude', 'gemini'];
    const providerIndex = providers.indexOf(provider);
    const button = testButtons[providerIndex];
    
    if (!button) return;
    
    const originalText = button.textContent;
    
    try {
        button.innerHTML = '<span class="loading"></span> Testing...';
        button.disabled = true;
        
        const result = await chrome.storage.sync.get(['apiKeys']);
        const apiKeys = result.apiKeys || {};
        const apiKey = apiKeys[provider];
        
        if (!apiKey) {
            showNotification('Please save an API key first', 'error');
            return;
        }
        
        // Send message to background script to test the API
        const response = await chrome.runtime.sendMessage({
            action: 'testApiKey',
            provider: provider,
            apiKey: apiKey
        });
        
        if (response.success) {
            updateProviderStatus(provider, 'connected');
            showNotification(`${getProviderName(provider)} API key is working!`, 'success');
        } else {
            updateProviderStatus(provider, 'error');
            showNotification(`${getProviderName(provider)} API key test failed: ${response.error}`, 'error');
        }
        
    } catch (error) {
        console.error('Error testing API key:', error);
        showNotification('Error testing API key', 'error');
        updateProviderStatus(provider, 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

async function clearApiKey(provider) {
    console.log('clearApiKey called for provider:', provider);
    try {
        const result = await chrome.storage.sync.get(['apiKeys']);
        const apiKeys = result.apiKeys || {};
        delete apiKeys[provider];
        
        await chrome.storage.sync.set({ apiKeys });
        
        document.getElementById(`${provider}-key`).value = '';
        updateProviderStatus(provider, 'disconnected');
        showNotification(`${getProviderName(provider)} API key cleared`, 'success');
        
        // If this was the selected provider, clear the selection
        if (document.getElementById(`${provider}-radio`).checked) {
            document.getElementById(`${provider}-radio`).checked = false;
            document.getElementById(`${provider}-provider`).classList.remove('active');
            await chrome.storage.sync.set({ selectedProvider: null });
        }
        
    } catch (error) {
        console.error('Error clearing API key:', error);
        showNotification('Error clearing API key', 'error');
    }
}

function updateProviderStatus(provider, status) {
    const statusElement = document.getElementById(`${provider}-status`);
    statusElement.className = `status ${status}`;
    
    switch (status) {
        case 'connected':
            statusElement.textContent = 'Connected';
            break;
        case 'disconnected':
            statusElement.textContent = 'Not configured';
            break;
        case 'error':
            statusElement.textContent = 'Error';
            break;
    }
}

function getProviderName(provider) {
    const names = {
        'openai': 'OpenAI',
        'claude': 'Claude',
        'gemini': 'Gemini'
    };
    return names[provider] || provider;
}

function showNotification(message, type) {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        padding: 10px 15px;
        border-radius: 6px;
        color: white;
        font-size: 12px;
        font-weight: 500;
        z-index: 1000;
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}
