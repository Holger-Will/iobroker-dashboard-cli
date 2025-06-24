class TerminalRenderer {
    constructor(options = {}) {
        this.config = {
            showBorders: options.showBorders !== false,
            scrollOffset: options.scrollOffset || 0,
            ...options
        };
        
        this.screen = [];
        this.scrollOffset = 0;
    }

    // Clear screen and prepare for rendering
    clearScreen() {
        // Clear terminal
        process.stdout.write('\x1b[2J\x1b[H');
        this.screen = [];
    }

    // Initialize screen buffer
    initScreen(width, height) {
        this.screen = [];
        for (let y = 0; y < height; y++) {
            this.screen[y] = new Array(width).fill(' ');
        }
    }

    // Write text to screen buffer at position
    writeToScreen(x, y, text, maxWidth = null) {
        if (y < 0 || y >= this.screen.length) return;
        
        const line = this.screen[y];
        const textToWrite = maxWidth ? text.substring(0, maxWidth) : text;
        
        for (let i = 0; i < textToWrite.length; i++) {
            const screenX = x + i;
            if (screenX >= 0 && screenX < line.length) {
                line[screenX] = textToWrite[i];
            }
        }
    }

    // Draw a box border
    drawBorder(x, y, width, height) {
        if (height < 2 || width < 2) return;
        
        // Top border
        this.writeToScreen(x, y, '┌' + '─'.repeat(width - 2) + '┐');
        
        // Side borders
        for (let i = 1; i < height - 1; i++) {
            this.writeToScreen(x, y + i, '│');
            this.writeToScreen(x + width - 1, y + i, '│');
        }
        
        // Bottom border
        this.writeToScreen(x, y + height - 1, '└' + '─'.repeat(width - 2) + '┘');
    }

    // Truncate text to fit width
    truncateText(text, maxWidth) {
        if (text.length <= maxWidth) return text;
        return text.substring(0, maxWidth - 3) + '...';
    }

    // Render a single group
    renderGroup(group, scrollOffset = 0) {
        const adjustedY = group.y - scrollOffset;
        
        // Skip if group is completely off-screen
        if (adjustedY + group.height < 0 || adjustedY >= this.screen.length) {
            return;
        }
        
        let currentY = adjustedY;
        
        // Draw border if enabled
        if (this.config.showBorders) {
            this.drawBorder(group.x, currentY, group.width, group.height);
            currentY += 1; // Move inside border
        }
        
        // Draw group title
        if (group.title) {
            const titleText = this.truncateText(group.title, group.width - 4);
            const titleX = group.x + (this.config.showBorders ? 2 : 0);
            this.writeToScreen(titleX, currentY, titleText, group.width - 4);
            currentY += 1;
        }
        
        // Draw elements
        for (const element of group.elements) {
            if (currentY >= this.screen.length) break;
            if (currentY >= 0) {
                this.renderElement(element, group.x + (this.config.showBorders ? 2 : 0), currentY, group.width - 4);
            }
            currentY += 1;
        }
    }

    // Render a single element
    renderElement(element, x, y, maxWidth) {
        let displayText;
        
        // Use element's render method if available (for DashboardElement instances)
        if (typeof element.render === 'function') {
            displayText = element.render(maxWidth);
        } else {
            // Fallback for plain objects
            displayText = this.renderPlainElement(element, maxWidth);
        }
        
        // Write to screen
        this.writeToScreen(x, y, displayText, maxWidth);
    }

    // Fallback rendering for plain element objects
    renderPlainElement(element, maxWidth) {
        const availableWidth = Math.max(5, maxWidth - 2);
        let leftText = '';
        let rightText = '';
        
        switch (element.type) {
            case 'gauge':
                leftText = element.caption;
                rightText = (element.value || 0).toString();
                break;
            case 'switch':
                const switchIcon = element.value ? '⬜' : '⬛';
                leftText = `${switchIcon} ${element.caption}`;
                rightText = element.value ? 'ON' : 'OFF';
                break;
            case 'button':
                leftText = `▶ ${element.caption}`;
                rightText = '';
                break;
            case 'indicator':
                const indicator = element.value ? '●' : '○';
                leftText = `${indicator} ${element.caption}`;
                rightText = element.value ? 'ON' : 'OFF';
                break;
            case 'text':
                leftText = element.caption;
                rightText = (element.value || '').toString();
                break;
            case 'sparkline':
                leftText = element.caption;
                rightText = '▁▂▃▅▇▅▃▂▁';
                break;
            default:
                leftText = element.caption;
                rightText = (element.value || 'N/A').toString();
        }
        
        return this.alignText(leftText, rightText, availableWidth);
    }

    // Align text with caption left and value right
    alignText(leftText, rightText, maxWidth) {
        // Truncate left text if too long
        const rightTextLength = rightText.length;
        const maxLeftLength = Math.max(1, maxWidth - rightTextLength - 1);
        
        if (leftText.length > maxLeftLength) {
            leftText = leftText.substring(0, maxLeftLength - 3) + '...';
        }
        
        // Calculate spacing
        const totalUsed = leftText.length + rightText.length;
        const spaces = Math.max(1, maxWidth - totalUsed);
        
        return leftText + ' '.repeat(spaces) + rightText;
    }

    // Render input field at bottom
    renderInputField(y, width, prompt = '> ', input = '') {
        if (y < 0 || y >= this.screen.length) return;
        
        // Clear input area
        this.writeToScreen(0, y, ' '.repeat(width));
        
        // Draw prompt and input
        const promptText = prompt + input;
        this.writeToScreen(0, y, promptText, width);
        
        // Draw cursor
        const cursorX = Math.min(promptText.length, width - 1);
        if (cursorX < width) {
            // Simple cursor representation
            this.writeToScreen(cursorX, y, '█');
        }
    }

    // Render complete layout
    render(layout, inputPrompt = '> ', inputText = '') {
        const availableHeight = layout.terminalHeight - 3; // Reserve space for input
        
        // Initialize screen
        this.initScreen(layout.terminalWidth, layout.terminalHeight);
        
        // Calculate scroll offset if needed
        if (layout.needsScrolling) {
            // Keep scroll within bounds
            this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, 
                layout.totalHeight - availableHeight));
        } else {
            this.scrollOffset = 0;
        }
        
        // Render all groups
        for (const group of layout.groups) {
            this.renderGroup(group, this.scrollOffset);
        }
        
        // Render input field at bottom
        const inputY = layout.terminalHeight - 2;
        this.renderInputField(inputY, layout.terminalWidth, inputPrompt, inputText);
        
        // Render scroll indicator if needed
        if (layout.needsScrolling) {
            const scrollInfo = `[${this.scrollOffset}/${layout.totalHeight - availableHeight}]`;
            this.writeToScreen(layout.terminalWidth - scrollInfo.length - 1, inputY - 1, scrollInfo);
        }
        
        // Output screen to terminal
        this.outputScreen();
    }

    // Output screen buffer to terminal
    outputScreen() {
        process.stdout.write('\x1b[H'); // Move cursor to top
        
        for (let y = 0; y < this.screen.length; y++) {
            const line = this.screen[y].join('');
            process.stdout.write(line);
            if (y < this.screen.length - 1) {
                process.stdout.write('\n');
            }
        }
    }

    // Scroll methods
    scrollUp(lines = 1) {
        this.scrollOffset = Math.max(0, this.scrollOffset - lines);
    }

    scrollDown(lines = 1, maxScroll) {
        this.scrollOffset = Math.min(maxScroll, this.scrollOffset + lines);
    }

    setScrollOffset(offset) {
        this.scrollOffset = Math.max(0, offset);
    }

    getScrollOffset() {
        return this.scrollOffset;
    }
}

export default TerminalRenderer;