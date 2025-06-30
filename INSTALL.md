# LeetCode AI Assistant Extension - Installation and Testing Guide

## Installation Instructions

### For Chrome/Brave Browser:

1. **Open Extension Management**
   - Navigate to `chrome://extensions/` (Chrome) or `brave://extensions/` (Brave)
   - Enable "Developer mode" in the top right

2. **Load the Extension**
   - Click "Load unpacked"
   - Select the folder: `c:\Users\sharm\OneDrive\Desktop\leetcode chatbot extension`
   - The extension should appear in your extensions list

3. **Pin the Extension**
   - Click the puzzle piece icon in the browser toolbar
   - Pin the "LeetCode AI Assistant" extension for easy access

## Testing Instructions

### 1. Setup API Key
- Click the extension icon in the browser toolbar
- Select your preferred AI provider (ChatGPT, Claude, or Gemini)
- Enter your API key
- Click "Save"

### 2. Test on LeetCode
- Navigate to any LeetCode problem page (e.g., https://leetcode.com/problems/two-sum/)
- The extension should automatically inject the chatbot
- Look for the floating AI assistant button (usually in the bottom-right corner)

### 3. Test Code Extraction
- Write some code in the LeetCode editor
- Click the AI assistant button to open the chatbot
- Try the "Explain my code" or "Debug my code" quick actions
- The chatbot should extract and display your code

### 4. Test Code Block Rendering
- Ask the AI assistant to provide a solution
- Code blocks should appear with:
  - Syntax highlighting (colors for keywords, strings, comments, etc.)
  - Line numbers on the left
  - Copy button in the top-right
  - Dark theme with GitHub-like appearance

### 5. Test Window Controls
- **Minimize**: Click the minimize button (─) to collapse the window
- **Fullscreen**: Click the fullscreen button (⛶) to expand
- **Close**: Click the X button to close the chatbot
- **Keyboard Shortcuts**:
  - `Ctrl+Shift+L` (Windows) or `Cmd+Shift+L` (Mac): Toggle chatbot
  - `Escape`: Close chatbot when focused

### 6. Debug Testing (if needed)
- Open browser Developer Tools (F12)
- Go to the Console tab
- Check for any error messages in the console
- Verify that the extension loads without errors

## Features to Test

### Code Extraction
- [ ] Extracts code from Monaco editor
- [ ] Works with different programming languages
- [ ] Handles empty/partial code gracefully

### AI Integration
- [ ] ChatGPT API working
- [ ] Claude API working  
- [ ] Gemini API working
- [ ] Error handling for invalid API keys

### Code Block Rendering
- [ ] Syntax highlighting for C++
- [ ] Syntax highlighting for Java
- [ ] Syntax highlighting for Python
- [ ] Syntax highlighting for JavaScript
- [ ] Line numbers displayed correctly
- [ ] Copy-to-clipboard functionality
- [ ] Proper scrolling for long code blocks

### UI/UX
- [ ] Responsive design (works in different window sizes)
- [ ] Smooth animations
- [ ] Professional appearance
- [ ] Fullscreen mode works correctly
- [ ] Minimize/restore functionality

### Quick Actions
- [ ] "Explain my code" button works
- [ ] "Debug my code" button works
- [ ] "Optimize my code" button works
- [ ] "Find alternative solution" button works

## Troubleshooting

### Extension Not Loading
- Ensure Developer mode is enabled
- Check for any error messages in chrome://extensions/
- Refresh the page after loading the extension

### Chatbot Not Appearing
- Check if you're on a valid LeetCode problem page
- Look for console errors in Developer Tools
- Try refreshing the page

### API Not Working
- Verify your API key is correct
- Check your internet connection
- Ensure you have sufficient API credits/quota

### Code Not Extracting
- Try writing some code in the editor first
- Check browser console for error messages
- Ensure the Monaco editor is fully loaded

### Style Issues
- Try refreshing the page
- Check if styles.css is being loaded properly
- Clear browser cache if necessary

## File Structure
```
leetcode chatbot extension/
├── manifest.json          # Extension configuration
├── popup.html             # Settings popup interface
├── popup.js               # Settings popup logic
├── background.js          # Service worker
├── content.js             # Main extension logic
├── styles.css             # All styling
├── prism/                 # Custom syntax highlighting
│   ├── custom-highlighter.js
│   └── syntax-theme.css
├── icons/                 # Extension icons
├── README.md              # Documentation
└── package.json           # Project metadata
```

## Support
If you encounter any issues, check the browser console for error messages and refer to the troubleshooting section above.
