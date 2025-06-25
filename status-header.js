import { EventEmitter } from 'events';
import { colorize, THEMES } from './colors.js';

export class StatusHeader extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.dashboard = options.dashboard;
        this.terminalWidth = options.terminalWidth || 80;
        this.visible = options.visible !== false; // default true
        this.showTimestamp = options.showTimestamp !== false; // default true
        
        // Status indicators
        this.indicators = {
            connected: '✓',
            disconnected: '✗',
            reconnecting: '⟳',
            scrolling: '↕'
        };
    }

    // Set visibility of status header
    setVisible(visible) {
        this.visible = visible;
        this.emit('visibility-changed', visible);
    }

    // Toggle visibility
    toggle() {
        this.setVisible(!this.visible);
    }

    // Update terminal width for responsive layout
    updateTerminalWidth(width) {
        this.terminalWidth = width;
    }

    // Get connection status info
    getConnectionStatus() {
        const client = this.dashboard?.client;
        if (!client) {
            return { status: 'unknown', color: THEMES.inactive, indicator: '?' };
        }

        // Check connected property first, then connectionState
        const isConnected = client.connected === true;
        const state = client.connectionState || (isConnected ? 'connected' : 'disconnected');

        switch (state) {
            case 'connected':
                return {
                    status: 'Connected',
                    color: THEMES.success,
                    indicator: this.indicators.connected,
                    url: client.url
                };
            case 'reconnecting':
                return {
                    status: 'Reconnecting',
                    color: THEMES.warning,
                    indicator: this.indicators.reconnecting,
                    url: client.url
                };
            default:
                return {
                    status: 'Disconnected',
                    color: THEMES.error,
                    indicator: this.indicators.disconnected,
                    url: client.url
                };
        }
    }

    // Get MCP connection status
    getMCPStatus() {
        const mcp = this.dashboard?.mcp;
        if (!mcp) {
            return { connected: false, toolCount: 0 };
        }

        return {
            connected: mcp.connected,
            toolCount: mcp.toolCount || 0
        };
    }

    // Get dashboard statistics
    getDashboardStats() {
        const groups = this.dashboard?.groups || [];
        const totalElements = groups.reduce((sum, group) => sum + (group.elements?.length || 0), 0);
        
        const layout = this.dashboard?.layout?.getLayout();
        
        return {
            groupCount: groups.length,
            elementCount: totalElements,
            columns: layout?.columns || 0,
            needsScrolling: layout?.needsScrolling || false
        };
    }

    // Format timestamp
    formatTimestamp() {
        const now = new Date();
        return now.toTimeString().slice(0, 5); // HH:MM format
    }

    // Abbreviate text for narrow displays
    abbreviateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.slice(0, maxLength - 1) + '…';
    }

    // Render status header for narrow terminals
    renderNarrow() {
        const connection = this.getConnectionStatus();
        const mcp = this.getMCPStatus();
        const stats = this.getDashboardStats();
        
        const parts = [];
        
        // Essential connection status with abbreviation
        const connLabel = this.terminalWidth < 50 ? 'ioBr' : 'ioBroker';
        const connText = `${colorize(connection.indicator || '?', connection.color || THEMES.inactive)} ${connLabel}: ${colorize(connection.status || 'Unknown', connection.color || THEMES.inactive)}`;
        parts.push(connText);
        
        // MCP status
        const mcpIndicator = mcp.connected ? '✓' : '✗';
        const mcpColor = mcp.connected ? THEMES.success : THEMES.error;
        parts.push(`${colorize(mcpIndicator, mcpColor)} MCP`);
        
        // Basic stats if space allows
        if (this.terminalWidth > 40) {
            parts.push(`${colorize(stats.groupCount, THEMES.value)} groups`);
            parts.push(`${colorize(stats.elementCount, THEMES.value)} elements`);
        }
        
        // Timestamp if space allows and enabled
        if (this.showTimestamp && this.terminalWidth > 50) {
            parts.push(colorize(this.formatTimestamp(), THEMES.caption));
        }
        
        const result = parts.join(' ');
        
        // Ensure we don't exceed terminal width
        if (this.getVisibleLength(result) > this.terminalWidth) {
            // Fall back to minimal display
            return `${colorize(connection.indicator || '?', connection.color || THEMES.inactive)} ${connection.status || 'Unknown'}`;
        }
        
        return result;
    }

    // Render status header for wide terminals
    renderWide() {
        const connection = this.getConnectionStatus();
        const mcp = this.getMCPStatus();
        const stats = this.getDashboardStats();
        
        // Left side: Connection status
        const leftParts = [];
        
        // ioBroker connection
        const connText = `${colorize(connection.indicator || '?', connection.color || THEMES.inactive)} ioBroker: ${colorize(connection.status || 'Unknown', connection.color || THEMES.inactive)}`;
        leftParts.push(connText);
        
        if (connection.url && this.terminalWidth > 80) {
            leftParts.push(colorize(`(${connection.url})`, THEMES.caption));
        }
        
        // MCP connection
        const mcpIndicator = mcp.connected ? '✓' : '✗';
        const mcpColor = mcp.connected ? THEMES.success : THEMES.error;
        let mcpText = `${colorize(mcpIndicator, mcpColor)} MCP`;
        if (mcp.connected && mcp.toolCount > 0) {
            mcpText += colorize(` (${mcp.toolCount} tools)`, THEMES.caption);
        }
        leftParts.push(mcpText);
        
        // Center: Dashboard stats
        const centerParts = [];
        centerParts.push(`${colorize(stats.groupCount, THEMES.value)} groups`);
        centerParts.push(`${colorize(stats.elementCount, THEMES.value)} elements`);
        centerParts.push(`${colorize(stats.columns, THEMES.value)} cols`);
        
        if (stats.needsScrolling) {
            centerParts.push(colorize(this.indicators.scrolling, THEMES.warning));
        }
        
        // Right side: Timestamp
        const rightParts = [];
        if (this.showTimestamp) {
            rightParts.push(colorize(this.formatTimestamp(), THEMES.caption));
        }
        
        // Combine all parts with proper spacing
        const leftText = leftParts.join(' ');
        const centerText = centerParts.join(' ');
        const rightText = rightParts.join(' ');
        
        return this.alignHeaderText(leftText, centerText, rightText);
    }

    // Align header text across terminal width
    alignHeaderText(leftText, centerText, rightText) {
        // Calculate visible lengths (excluding ANSI codes)
        const leftLength = this.getVisibleLength(leftText);
        const centerLength = this.getVisibleLength(centerText);
        const rightLength = this.getVisibleLength(rightText);
        
        const totalContentLength = leftLength + centerLength + rightLength;
        const availableSpacing = this.terminalWidth - totalContentLength;
        
        if (availableSpacing < 4) {
            // Not enough space for proper alignment, truncate and join with spaces
            const result = [leftText, centerText, rightText].filter(Boolean).join(' ');
            const visibleLength = this.getVisibleLength(result);
            if (visibleLength <= this.terminalWidth) {
                return result;
            }
            // If still too long, just return left text truncated
            return leftText;
        }
        
        // Calculate spacing to distribute evenly
        const leftSpacing = Math.floor(availableSpacing / 2);
        const rightSpacing = availableSpacing - leftSpacing;
        
        const result = leftText + ' '.repeat(Math.max(1, leftSpacing)) + centerText + ' '.repeat(Math.max(1, rightSpacing)) + rightText;
        
        // Final safety check
        if (this.getVisibleLength(result) > this.terminalWidth) {
            return [leftText, centerText, rightText].filter(Boolean).join(' ');
        }
        
        return result;
    }

    // Get visible text length (excluding ANSI color codes)
    getVisibleLength(text) {
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    // Render status header
    render() {
        if (!this.visible) {
            return '';
        }
        
        // Choose layout based on terminal width
        if (this.terminalWidth < 80) {
            return this.renderNarrow();
        } else {
            return this.renderWide();
        }
    }

    // Get configuration for saving
    getConfig() {
        return {
            visible: this.visible,
            showTimestamp: this.showTimestamp
        };
    }

    // Apply configuration
    applyConfig(config) {
        if (config.visible !== undefined) {
            this.setVisible(config.visible);
        }
        if (config.showTimestamp !== undefined) {
            this.showTimestamp = config.showTimestamp;
        }
    }
}

export default StatusHeader;