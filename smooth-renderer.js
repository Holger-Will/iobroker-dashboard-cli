import { colorize, THEMES, BORDER_STYLES, COLORS } from './colors.js';

class SmoothRenderer {
    constructor(options = {}) {
        this.config = {
            showBorders: options.showBorders !== false,
            ...options
        };
        
        this.lastLayout = null;
        this.elementPositions = new Map(); // Track where each element is rendered
        this.initialized = false;
    }

    // Move cursor to specific position
    moveTo(x, y) {
        process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
    }

    // Clear from cursor to end of line
    clearToEndOfLine() {
        process.stdout.write('\x1b[K');
    }

    // Write text at current cursor position
    writeText(text) {
        process.stdout.write(text);
    }

    // Initial full render (only once)
    initialRender(layout, inputPrompt = '> ', inputText = '', messages = [], scrollOffset = 0, selectedElement = null, commandMode = false) {
        // Clear screen completely for initial render
        process.stdout.write('\x1b[2J\x1b[H');
        
        // Hide cursor during rendering
        process.stdout.write('\x1b[?25l');
        
        // In command mode, only render message area and input field
        if (!commandMode) {
            // Render dashboard groups first
            this.elementPositions.clear();
            for (const group of layout.groups) {
                this.renderGroup(group, 0, selectedElement);
            }
        }
        
        // Then render message area and input field separately
        this.renderMessageArea(layout, messages, scrollOffset, commandMode);
        this.renderInputField(layout, inputPrompt, inputText);
        
        this.lastLayout = this.cloneLayout(layout);
        this.initialized = true;
        
        // Position cursor and show it
        this.positionCursor(layout, inputPrompt, inputText);
        process.stdout.write('\x1b[?25h');
    }

    // Update only changed elements
    updateRender(layout, inputPrompt = '> ', inputText = '', messages = [], scrollOffset = 0, selectedElement = null, commandMode = false) {
        if (!this.initialized) {
            this.initialRender(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode);
            return;
        }

        // Hide cursor during updates
        process.stdout.write('\x1b[?25l');

        // In command mode, skip dashboard group updates and clear dashboard area
        if (commandMode) {
            // Clear dashboard area completely
            this.clearDashboardArea(layout);
        } else {
            // Update only elements that have changed
            this.updateChangedElements(layout, selectedElement);
        }
        
        // Update message area independently
        this.updateMessageArea(layout, messages, scrollOffset, commandMode);
        
        // Update input field independently
        this.updateInputField(layout, inputPrompt, inputText);
        
        this.lastLayout = this.cloneLayout(layout);
        
        // Show cursor at input position
        this.positionCursor(layout, inputPrompt, inputText);
        process.stdout.write('\x1b[?25h');
    }

    // Clear dashboard area for command mode
    clearDashboardArea(layout) {
        const inputAreaHeight = 3;
        const messageAreaHeight = layout.terminalHeight - inputAreaHeight;
        const dashboardEndY = layout.terminalHeight - inputAreaHeight - messageAreaHeight;
        
        // Clear all lines above the message area
        for (let y = 0; y < dashboardEndY; y++) {
            this.moveTo(0, y);
            this.clearToEndOfLine();
        }
    }

    // Update only elements that have changed values
    updateChangedElements(layout, selectedElement = null) {
        for (const group of layout.groups) {
            let elementY = group.y;
            
            // Skip border (title is integrated into border now)
            if (this.config.showBorders) {
                elementY += 1;
            } else if (group.title) {
                // If no borders but has title, skip title line
                elementY += 1;
            }
            
            for (const element of group.elements) {
                const elementKey = `${group.id}_${element.id}`;
                const lastElement = this.elementPositions.get(elementKey);
                
                // Check if element is currently selected
                const isSelected = selectedElement && 
                                 selectedElement.element && 
                                 selectedElement.element.id === element.id &&
                                 selectedElement.groupId === group.id;
                
                // Check if element value has changed or selection state changed
                const lastSelected = lastElement ? lastElement.selected : false;
                if (!lastElement || lastElement.value !== element.value || lastSelected !== isSelected) {
                    this.updateElement(element, group, elementY, isSelected);
                    
                    // Store current element state
                    this.elementPositions.set(elementKey, {
                        value: element.value,
                        selected: isSelected,
                        x: group.x + (this.config.showBorders ? 2 : 0),
                        y: elementY
                    });
                }
                
                elementY += 1;
            }
        }
    }

    // Update a single element
    updateElement(element, group, y, isSelected = false) {
        const x = group.x + (this.config.showBorders ? 2 : 0);
        const maxWidth = group.width - 4;
        
        // Move to element position
        this.moveTo(x, y);
        
        // Render the element
        let displayText;
        if (typeof element.render === 'function') {
            displayText = element.render(maxWidth);
        } else {
            displayText = this.renderPlainElement(element, maxWidth);
        }
        
        // Add selection indicator if selected - highlight the complete line with background color
        if (isSelected && (element.type === 'button' || element.type === 'switch')) {
            // Strip existing colors from display text and apply selection colors to entire line
            const cleanText = displayText.replace(/\x1b\[[0-9;]*m/g, '');
            // Apply background color to exact content, then pad with normal spaces
            this.writeText(`${THEMES.selectedBg}${THEMES.selectedText}${cleanText}${COLORS.reset}`);
            // Pad the rest with normal spaces to fill width and clear any background remnants
            const remainingSpaces = maxWidth - this.getVisibleLength(cleanText);
            if (remainingSpaces > 0) {
                this.writeText(' '.repeat(remainingSpaces));
            }
        } else {
            // Write element text normally, ensuring we overwrite any previous selection background
            const paddedText = displayText.padEnd(maxWidth, ' ');
            // Force normal colors to overwrite any background remnants
            this.writeText(`${COLORS.reset}${paddedText}`);
        }
        
        // Redraw right border if needed
        if (this.config.showBorders) {
            this.moveTo(group.x + group.width - 1, y);
            this.writeText(colorize(THEMES.borderStyle.vertical, THEMES.border));
        }
    }

    // Render a complete group (for initial render)
    renderGroup(group, scrollOffset = 0, selectedElement = null) {
        const adjustedY = group.y - scrollOffset;
        
        // Skip if group is completely off-screen
        if (adjustedY + group.height < 0 || adjustedY >= process.stdout.rows) {
            return;
        }
        
        let currentY = adjustedY;
        
        // Draw border with integrated title if enabled
        if (this.config.showBorders) {
            this.drawBorder(group.x, currentY, group.width, group.height, group.title);
            currentY += 1;
        } else if (group.title) {
            // If no borders, still show title separately
            this.moveTo(group.x, currentY);
            const coloredTitle = colorize(group.title, THEMES.title);
            this.writeText(coloredTitle);
            currentY += 1;
        }
        
        // Draw elements and store their positions
        for (const element of group.elements) {
            const elementKey = `${group.id}_${element.id}`;
            const elementX = group.x + (this.config.showBorders ? 2 : 0);
            
            // Check if element is currently selected
            const isSelected = selectedElement && 
                             selectedElement.element && 
                             selectedElement.element.id === element.id &&
                             selectedElement.groupId === group.id;
            
            this.moveTo(elementX, currentY);
            
            let displayText;
            if (typeof element.render === 'function') {
                displayText = element.render(group.width - 4);
            } else {
                displayText = this.renderPlainElement(element, group.width - 4);
            }
            
            // Add selection indicator if selected - highlight the complete line with background color
            if (isSelected && (element.type === 'button' || element.type === 'switch')) {
                // Strip existing colors from display text and apply selection colors to entire line
                const cleanText = displayText.replace(/\x1b\[[0-9;]*m/g, '');
                const maxElementWidth = group.width - 4;
                // Apply background color to exact content, then pad with normal spaces
                this.writeText(`${THEMES.selectedBg}${THEMES.selectedText}${cleanText}${COLORS.reset}`);
                // Pad the rest with normal spaces to fill width and clear any background remnants
                const remainingSpaces = maxElementWidth - this.getVisibleLength(cleanText);
                if (remainingSpaces > 0) {
                    this.writeText(' '.repeat(remainingSpaces));
                }
            } else {
                // Write element text normally, ensuring we overwrite any previous selection background
                const paddedText = displayText.padEnd(group.width - 4, ' ');
                // Force normal colors to overwrite any background remnants
                this.writeText(`${COLORS.reset}${paddedText}`);
            }
            
            // Store element position
            this.elementPositions.set(elementKey, {
                value: element.value,
                selected: isSelected,
                x: elementX,
                y: currentY
            });
            
            currentY += 1;
        }
    }

    // Draw border around group with colors and integrated title
    drawBorder(x, y, width, height, title = '') {
        if (height < 2 || width < 2) return;
        
        const style = THEMES.borderStyle;
        
        // Top border with integrated title
        this.moveTo(x, y);
        if (title) {
            const maxTitleLength = width - 6; // Account for style.topLeft[  ]──
            const truncatedTitle = this.truncateText(title, maxTitleLength);
            const titlePart = `${style.topLeft}[${truncatedTitle}]`;
            const remainingDashes = width - titlePart.length - 1;
            const topBorder = colorize(titlePart, THEMES.border) + 
                             colorize(style.horizontal.repeat(Math.max(0, remainingDashes)), THEMES.border) + 
                             colorize(style.topRight, THEMES.border);
            this.writeText(topBorder);
        } else {
            const topBorder = colorize(style.topLeft + style.horizontal.repeat(width - 2) + style.topRight, THEMES.border);
            this.writeText(topBorder);
        }
        
        // Side borders
        for (let i = 1; i < height - 1; i++) {
            this.moveTo(x, y + i);
            this.writeText(colorize(style.vertical, THEMES.border));
            this.moveTo(x + width - 1, y + i);
            this.writeText(colorize(style.vertical, THEMES.border));
        }
        
        // Bottom border
        this.moveTo(x, y + height - 1);
        const bottomBorder = colorize(style.bottomLeft + style.horizontal.repeat(width - 2) + style.bottomRight, THEMES.border);
        this.writeText(bottomBorder);
    }

    // Render input field with border
    renderInputField(layout, prompt = '> ', input = '') {
        const inputAreaHeight = 3;
        const startY = layout.terminalHeight - inputAreaHeight;
        
        // Clear input area
        for (let i = 0; i < inputAreaHeight; i++) {
            this.moveTo(0, startY + i);
            this.clearToEndOfLine();
        }
        
        // Top border
        this.moveTo(0, startY);
        const style = THEMES.borderStyle;
        const topBorder = colorize(style.topLeft + style.horizontal.repeat(layout.terminalWidth - 2) + style.topRight, THEMES.border);
        this.writeText(topBorder);
        
        // Input line with side borders
        this.moveTo(0, startY + 1);
        const leftBorder = colorize(style.vertical + ' ', THEMES.border);
        const rightBorder = colorize(' ' + style.vertical, THEMES.border);
        const maxInputWidth = layout.terminalWidth - 4; // Account for borders and spaces
        
        const coloredPrompt = colorize(prompt, THEMES.prompt);
        const coloredInput = colorize(input, THEMES.input);
        const inputContent = coloredPrompt + coloredInput;
        
        // Pad input content to fill width
        const paddingNeeded = Math.max(0, maxInputWidth - this.getVisibleLength(inputContent));
        const paddedContent = inputContent + ' '.repeat(paddingNeeded);
        
        this.writeText(leftBorder + paddedContent + rightBorder);
        
        // Bottom border
        this.moveTo(0, startY + 2);
        const bottomBorder = colorize(style.bottomLeft + style.horizontal.repeat(layout.terminalWidth - 2) + style.bottomRight, THEMES.border);
        this.writeText(bottomBorder);
    }

    // Update input field only
    updateInputField(layout, prompt = '> ', input = '') {
        // Just redraw the input field - border doesn't change
        const inputAreaHeight = 3;
        const startY = layout.terminalHeight - inputAreaHeight;
        const style = THEMES.borderStyle;
        
        // Update input line only
        this.moveTo(0, startY + 1);
        const leftBorder = colorize(style.vertical + ' ', THEMES.border);
        const rightBorder = colorize(' ' + style.vertical, THEMES.border);
        const maxInputWidth = layout.terminalWidth - 4;
        
        const coloredPrompt = colorize(prompt, THEMES.prompt);
        const coloredInput = colorize(input, THEMES.input);
        const inputContent = coloredPrompt + coloredInput;
        
        // Pad input content to fill width
        const paddingNeeded = Math.max(0, maxInputWidth - this.getVisibleLength(inputContent));
        const paddedContent = inputContent + ' '.repeat(paddingNeeded);
        
        this.writeText(leftBorder + paddedContent + rightBorder);
    }

    // Render message area
    renderMessageArea(layout, messages = [], scrollOffset = 0, commandMode = false) {
        const inputAreaHeight = 3;
        
        // In command mode, message area takes full screen except input
        const messageAreaHeight = commandMode ? 
            layout.terminalHeight - inputAreaHeight : 
            Math.min(8, Math.max(3, messages.length + 2));
        const startY = layout.terminalHeight - inputAreaHeight - messageAreaHeight; // Above input field
        
        // Clear message area
        for (let i = 0; i < messageAreaHeight; i++) {
            this.moveTo(0, startY + i);
            this.clearToEndOfLine();
        }
        
        // Draw complete border frame around message area
        this.drawMessageBorder(0, startY, layout.terminalWidth, messageAreaHeight, 'Output');
        
        // Render messages with scrolling support
        const maxMessages = messageAreaHeight - 2; // Account for top and bottom borders
        const totalMessages = messages.length;
        
        // Calculate which messages to show based on scroll offset
        let startIndex, endIndex;
        if (scrollOffset === 0) {
            // Show most recent messages (default behavior)
            endIndex = totalMessages;
            startIndex = Math.max(0, endIndex - maxMessages);
        } else {
            // Show messages from scroll position
            endIndex = Math.max(maxMessages, totalMessages - scrollOffset);
            startIndex = Math.max(0, endIndex - maxMessages);
        }
        
        const displayMessages = messages.slice(startIndex, endIndex);
        
        // Show scroll indicators if there are more messages
        const hasMoreAbove = startIndex > 0;
        const hasMoreBelow = endIndex < totalMessages && scrollOffset > 0;
        
        const style = THEMES.borderStyle;
        for (let i = 0; i < maxMessages; i++) {
            this.moveTo(0, startY + 1 + i);
            this.clearToEndOfLine();
            
            // Left border
            this.writeText(colorize(style.vertical + ' ', THEMES.border));
            
            // Message content with proper width accounting for borders
            const contentWidth = layout.terminalWidth - 4; // Account for left and right borders + spaces
            let messageContent = '';
            
            if (i === 0 && hasMoreAbove) {
                // Show "more above" indicator
                messageContent = colorize('▲ ••• more messages above ••• (↑ to scroll)', THEMES.neutral);
            } else if (i === maxMessages - 1 && hasMoreBelow) {
                // Show "more below" indicator  
                messageContent = colorize('▼ ••• more messages below ••• (↓ to scroll)', THEMES.neutral);
            } else {
                // Show actual message
                const messageIndex = hasMoreAbove ? i - 1 : i;
                if (messageIndex >= 0 && messageIndex < displayMessages.length) {
                    const message = displayMessages[messageIndex];
                    messageContent = this.formatMessage(message, contentWidth);
                }
            }
            
            // Pad message content to fill width and add right border
            const visibleLength = this.getVisibleLength(messageContent);
            const paddingNeeded = Math.max(0, contentWidth - visibleLength);
            const paddedContent = messageContent + ' '.repeat(paddingNeeded);
            this.writeText(paddedContent);
            
            // Right border - ensure we're at the correct position
            this.writeText(colorize(' ' + style.vertical, THEMES.border));
        }
    }

    // Update message area only
    updateMessageArea(layout, messages = [], scrollOffset = 0, commandMode = false) {
        this.renderMessageArea(layout, messages, scrollOffset, commandMode);
    }

    // Draw border frame around message area
    drawMessageBorder(x, y, width, height, title = '') {
        if (height < 2 || width < 2) return;
        
        const style = THEMES.borderStyle;
        
        // Top border with integrated title
        this.moveTo(x, y);
        if (title) {
            const maxTitleLength = width - 6; // Account for style.topLeft[  ]──
            const truncatedTitle = this.truncateText(title, maxTitleLength);
            const titlePart = `${style.topLeft}[${truncatedTitle}]`;
            const remainingDashes = width - titlePart.length - 1;
            const topBorder = colorize(titlePart, THEMES.border) + 
                             colorize(style.horizontal.repeat(Math.max(0, remainingDashes)), THEMES.border) + 
                             colorize(style.topRight, THEMES.border);
            this.writeText(topBorder);
        } else {
            const topBorder = colorize(style.topLeft + style.horizontal.repeat(width - 2) + style.topRight, THEMES.border);
            this.writeText(topBorder);
        }
        
        // Bottom border
        this.moveTo(x, y + height - 1);
        const bottomBorder = colorize(style.bottomLeft + style.horizontal.repeat(width - 2) + style.bottomRight, THEMES.border);
        this.writeText(bottomBorder);
    }

    // Format a message for display
    formatMessage(message, maxWidth) {
        if (typeof message === 'string') {
            return this.truncateText(message, maxWidth);
        }
        
        if (message.type === 'success') {
            return colorize('[OK] ', THEMES.active) + this.truncateText(message.text, maxWidth - 5);
        } else if (message.type === 'error') {
            return colorize('[ERROR] ', THEMES.error) + this.truncateText(message.text, maxWidth - 8);
        } else if (message.type === 'info') {
            return colorize('[INFO] ', THEMES.neutral) + this.truncateText(message.text, maxWidth - 7);
        } else if (message.type === 'warning') {
            return colorize('[WARN] ', THEMES.warning) + this.truncateText(message.text, maxWidth - 7);
        }
        
        return this.truncateText(message.text || message.toString(), maxWidth);
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
                leftText = element.caption;
                rightText = `${element.value ? 'ON' : 'OFF'} ${switchIcon}`;
                break;
            case 'button':
                leftText = element.caption;
                rightText = '▶';
                break;
            case 'indicator':
                const indicator = element.value ? '●' : '○';
                leftText = element.caption;
                rightText = `${element.value ? 'ON' : 'OFF'} ${indicator}`;
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

    // Get visible length of text (excluding ANSI color codes)
    getVisibleLength(text) {
        // Remove ANSI color codes and return string length
        // Since we removed all emojis, simple string length should work perfectly
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    // Align text with caption left and value right
    alignText(leftText, rightText, maxWidth) {
        const rightTextLength = this.getVisibleLength(rightText);
        const leftTextLength = this.getVisibleLength(leftText);
        const maxLeftLength = Math.max(1, maxWidth - rightTextLength - 1);
        
        if (leftTextLength > maxLeftLength) {
            // For colored text truncation, strip colors first
            const visiblePart = leftText.replace(/\x1b\[[0-9;]*m/g, '');
            if (visiblePart.length > maxLeftLength) {
                leftText = visiblePart.substring(0, maxLeftLength - 3) + '...';
            }
        }
        
        const totalUsed = this.getVisibleLength(leftText) + rightTextLength;
        const spaces = Math.max(1, maxWidth - totalUsed);
        
        return leftText + ' '.repeat(spaces) + rightText;
    }

    // Truncate text to fit width
    truncateText(text, maxWidth) {
        if (text.length <= maxWidth) return text;
        return text.substring(0, maxWidth - 3) + '...';
    }

    // Position cursor at the correct input location
    positionCursor(layout, prompt = '> ', input = '') {
        const inputAreaHeight = 3;
        const inputY = layout.terminalHeight - inputAreaHeight + 1; // Middle line of input area
        const promptLength = this.getVisibleLength(prompt);
        const inputLength = this.getVisibleLength(input);
        const cursorX = 2 + promptLength + inputLength; // After border, prompt, and current input
        
        this.moveTo(cursorX, inputY);
    }

    // Clone layout without circular references
    cloneLayout(layout) {
        return {
            groups: layout.groups.map(group => ({
                ...group,
                elements: group.elements.map(element => ({
                    id: element.id,
                    type: element.type,
                    caption: element.caption,
                    value: element.value,
                    stateId: element.stateId
                }))
            })),
            columns: layout.columns,
            totalHeight: layout.totalHeight,
            terminalWidth: layout.terminalWidth,
            terminalHeight: layout.terminalHeight,
            needsScrolling: layout.needsScrolling
        };
    }
}

export default SmoothRenderer;