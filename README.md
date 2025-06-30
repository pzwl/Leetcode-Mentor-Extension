# LeetCode AI Assistant - Browser Extension

A powerful browser extension that integrates AI chatbots (ChatGPT, Claude, Gemini) directly into your LeetCode problem-solving experience.

## Features

🤖 **Multi-AI Support**: Choose between ChatGPT, Claude, or Gemini 2.5 Pro
📝 **Smart Problem Analysis**: Automatically extracts problem details and your current code
💬 **Interactive Chat**: Get help with understanding problems, debugging, and optimization
🔒 **Secure API Storage**: Your API keys are stored locally and encrypted
🎯 **Context-Aware**: AI understands the specific problem you're working on
⚡ **Quick Actions**: Pre-built prompts for common help requests

## Installation

### For Development/Local Installation:

1. **Clone or Download** this repository to your local machine

2. **Get API Keys** (you need at least one):
   - **OpenAI (ChatGPT)**: Visit [platform.openai.com](https://platform.openai.com) → API keys
   - **Anthropic (Claude)**: Visit [console.anthropic.com](https://console.anthropic.com) → API keys  
   - **Google (Gemini)**: Visit [aistudio.google.com](https://aistudio.google.com) → Get API key

3. **Load the Extension**:
   - Open Chrome/Brave/Edge and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the extension folder
   - The extension icon should appear in your browser toolbar

4. **Configure API Keys**:
   - Click the extension icon in your browser toolbar
   - Add your API key for your preferred AI provider
   - Test the connection to ensure it's working

## Usage

1. **Navigate to LeetCode**: Go to any problem page on leetcode.com
2. **Click "Get AI Help"**: A button will appear in the bottom-right corner
3. **Start Chatting**: The AI assistant will help you with:
   - Understanding the problem
   - Suggesting algorithms and approaches
   - Reviewing and debugging your code
   - Optimizing your solution
   - Explaining concepts

## How It Works

### Problem Detection
- Automatically extracts problem title, description, and constraints
- Captures your current code from the editor
- Detects the programming language you're using

### AI Integration
- Sends contextual information to your chosen AI provider
- Maintains conversation history for better context
- Formats responses with syntax highlighting

### Privacy & Security
- API keys are stored locally in your browser
- No data is sent to our servers
- All communication is directly between your browser and the AI provider

## Supported AI Providers

| Provider | Model | Features |
|----------|--------|----------|
| OpenAI | GPT-3.5-turbo | Fast responses, good code understanding |
| Anthropic | Claude-3-haiku | Excellent reasoning, detailed explanations |
| Google | Gemini Pro | Advanced problem solving, code analysis |

## File Structure

```
leetcode-ai-assistant/
├── manifest.json          # Extension configuration
├── popup.html             # Settings popup interface
├── popup.js               # Settings popup logic
├── background.js          # Background service worker
├── content.js             # Main LeetCode page integration
├── styles.css             # All styling for the extension
├── prism/                 # Custom syntax highlighting
│   ├── custom-highlighter.js  # Local syntax highlighter
│   └── syntax-theme.css        # Dark theme for code blocks
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── INSTALL.md             # Detailed installation guide
└── README.md              # This file
```

## Permissions Explained

- `activeTab`: Access the current LeetCode tab to extract problem data
- `storage`: Store API keys securely in browser storage  
- `scripting`: Inject the chat interface into LeetCode pages
- `host_permissions`: Only works on leetcode.com for security

## Development

To modify or extend the extension:

1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes on LeetCode

### Key Components

- **content.js**: Handles problem extraction and UI injection
- **background.js**: Manages API calls to AI providers
- **popup.js**: Settings interface for API key management

## Troubleshooting

### Common Issues:

**"API key test failed"**
- Verify your API key is correct
- Check if you have credits/quota remaining
- Ensure internet connection is stable

**"No AI response"**
- Check the browser console for errors
- Verify the AI provider's API is not down
- Try switching to a different AI provider

**"Button not appearing"**
- Refresh the LeetCode page
- Ensure you're on a problem page (not the problems list)
- Check if the extension is enabled

### Debug Mode:
1. Right-click on any LeetCode page
2. Select "Inspect" → "Console"
3. Look for extension-related log messages

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve the extension!

## License

This project is open source and available under the MIT License.

## Disclaimer

This extension is not affiliated with LeetCode. Use responsibly and in accordance with LeetCode's terms of service. API usage costs are your responsibility.
