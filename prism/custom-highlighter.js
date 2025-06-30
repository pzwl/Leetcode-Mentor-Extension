// Custom lightweight syntax highlighter
window.CustomHighlighter = {
    languages: {
        cpp: {
            keywords: /\b(class|struct|public|private|protected|virtual|static|const|int|float|double|char|bool|void|string|vector|map|unordered_map|set|unordered_set|queue|stack|priority_queue|pair|auto|for|while|if|else|switch|case|default|return|break|continue|true|false|null|nullptr|new|delete|sizeof|typedef|template|namespace|using|include)\b/g,
            strings: /"[^"]*"|'[^']*'/g,
            comments: /\/\/[^\r\n]*|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\//g,
            numbers: /\b\d+\.?\d*\b/g,
            functions: /\b([a-zA-Z_]\w*)\s*(?=\()/g,
            preprocessor: /#[^\r\n]*/g
        },
        java: {
            keywords: /\b(class|interface|extends|implements|public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|int|float|double|char|boolean|byte|short|long|void|String|Object|ArrayList|HashMap|HashSet|LinkedList|Queue|Stack|List|Map|Set|for|while|if|else|switch|case|default|return|break|continue|try|catch|finally|throw|throws|new|this|super|true|false|null|package|import)\b/g,
            strings: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'/g,
            comments: /\/\/.*|\/\*[\s\S]*?\*\//g,
            numbers: /\b\d+(?:\.\d+)?[fFdDlL]?\b/g,
            functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g
        },
        python: {
            keywords: /\b(def|class|import|from|as|if|elif|else|for|while|try|except|finally|with|lambda|return|yield|break|continue|pass|global|nonlocal|and|or|not|in|is|True|False|None|int|float|str|list|dict|set|tuple|len|range|enumerate|zip|map|filter|sorted|reversed|any|all|sum|min|max|abs|round|print)\b/g,
            strings: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|"""[\s\S]*?"""|'''[\s\S]*?'''/g,
            comments: /#.*/g,
            numbers: /\b\d+(?:\.\d+)?\b/g,
            functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g
        },
        javascript: {
            keywords: /\b(function|var|let|const|if|else|for|while|do|switch|case|default|return|break|continue|try|catch|finally|throw|new|this|class|extends|import|export|from|default|async|await|true|false|null|undefined|typeof|instanceof|in|of|Array|Object|String|Number|Boolean|Date|Math|JSON|Promise|Set|Map|WeakMap|WeakSet|Symbol|Proxy|Reflect)\b/g,
            strings: /"([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`/g,
            comments: /\/\/.*|\/\*[\s\S]*?\*\//g,
            numbers: /\b\d+(?:\.\d+)?\b/g,
            functions: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?=\()/g
        }
    },

    highlight: function(code, language) {
        const lang = this.languages[language];
        if (!lang) {
            // If no language support, just create line structure without highlighting
            const lines = this.escapeHtml(code).split('\n');
            return lines.map((line, index) => {
                const lineNumber = index + 1;
                return `<div class="code-line">
                    <span class="line-number">${lineNumber}</span>
                    <span class="line-content">${line || ' '}</span>
                </div>`;
            }).join('');
        }

        // Split into lines first, then highlight each line separately to avoid regex conflicts
        const lines = code.split('\n');
        const highlightedLines = lines.map((line, index) => {
            const lineNumber = index + 1;
            let highlightedLine = this.escapeHtml(line);
            
            // Skip highlighting for very short lines or lines that might cause issues
            if (line.length < 2 || line.includes('class=class')) {
                return `<div class="code-line">
                    <span class="line-number">${lineNumber}</span>
                    <span class="line-content">${highlightedLine || ' '}</span>
                </div>`;
            }
            
            // Apply highlighting in a safe order with fresh regex instances
            try {
                // Comments first (they have priority) - but only if line contains comment markers
                if (lang.comments && (line.includes('//') || line.includes('/*') || line.includes('#'))) {
                    const commentRegex = new RegExp(lang.comments.source, 'g');
                    highlightedLine = highlightedLine.replace(commentRegex, '<span class="token comment">$&</span>');
                }
                
                // Strings second - but only if line contains quotes
                if (lang.strings && (line.includes('"') || line.includes("'") || line.includes('`'))) {
                    const stringRegex = new RegExp(lang.strings.source, 'g');
                    highlightedLine = highlightedLine.replace(stringRegex, '<span class="token string">$&</span>');
                }
                
                // Keywords third - but be very careful
                if (lang.keywords && highlightedLine.indexOf('<span') === -1) { // Only if no spans already
                    const keywordRegex = new RegExp(lang.keywords.source, 'g');
                    highlightedLine = highlightedLine.replace(keywordRegex, '<span class="token keyword">$&</span>');
                }
                
                // Numbers fourth - but only simple patterns
                if (lang.numbers && line.match(/\d/) && highlightedLine.indexOf('<span') === -1) {
                    const numberRegex = new RegExp(lang.numbers.source, 'g');
                    highlightedLine = highlightedLine.replace(numberRegex, '<span class="token number">$&</span>');
                }
                
            } catch (e) {
                console.log('Highlighting error on line:', line, e);
                // If any error, just use escaped HTML
                highlightedLine = this.escapeHtml(line);
            }
            
            return `<div class="code-line">
                <span class="line-number">${lineNumber}</span>
                <span class="line-content">${highlightedLine || ' '}</span>
            </div>`;
        });

        return highlightedLines.join('');
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    highlightAll: function() {
        document.querySelectorAll('pre code[class*="language-"]').forEach(block => {
            const language = block.className.match(/language-(\w+)/);
            if (language) {
                const lang = language[1];
                const code = block.textContent;
                block.innerHTML = this.highlight(code, lang);
            }
        });
    }
};

// Make it available globally as Prism for compatibility
window.Prism = {
    languages: window.CustomHighlighter.languages,
    highlight: window.CustomHighlighter.highlight.bind(window.CustomHighlighter),
    highlightAll: window.CustomHighlighter.highlightAll.bind(window.CustomHighlighter)
};
