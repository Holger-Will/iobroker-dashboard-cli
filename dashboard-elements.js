import { EventEmitter } from 'events';
import { colorize, colorizeIndicator, colorizeSwitch, colorizePower, colorizeSystemState, THEMES } from './colors.js';

class DashboardElement extends EventEmitter {
    constructor(config) {
        super();
        
        this.id = config.id || `element_${Date.now()}`;
        this.type = config.type || 'text';
        this.caption = config.caption || 'Unnamed';
        this.stateId = config.stateId;
        this.value = config.value;
        this.lastUpdate = null;
        this.interactive = config.interactive !== false; // default true
        this.unit = config.unit || '';
        this.format = config.format || null; // number formatting function
        this.min = config.min;
        this.max = config.max;
        
        // State management
        this.connected = false;
        this.iobrokerClient = null;
    }

    // Connect to ioBroker client
    connect(iobrokerClient) {
        this.iobrokerClient = iobrokerClient;
        this.connected = true;
        
        // Subscribe to state changes for this element
        if (this.stateId) {
            this.subscribeToState();
        }
    }

    // Subscribe to state changes
    subscribeToState() {
        if (!this.iobrokerClient || !this.stateId) return;
        
        // Listen for state changes
        this.iobrokerClient.on('stateChange', (data) => {
            if (data.id === this.stateId) {
                this.updateValue(data.state?.val, data.timestamp);
            }
        });
        
        // Get initial state value
        this.iobrokerClient.getState(this.stateId)
            .then(state => {
                if (state) {
                    this.updateValue(state.val, Date.now());
                }
            })
            .catch(error => {
                console.error(`Failed to get initial state for ${this.stateId}:`, error.message);
            });
    }

    // Update element value
    updateValue(newValue, timestamp = Date.now()) {
        const oldValue = this.value;
        this.value = newValue;
        this.lastUpdate = timestamp;
        
        if (oldValue !== newValue) {
            this.emit('valueChanged', {
                element: this,
                oldValue,
                newValue,
                timestamp
            });
        }
    }

    // Format value for display
    formatValue() {
        if (this.value === null || this.value === undefined) {
            return 'N/A';
        }
        
        // Apply custom formatting function if provided
        if (this.format && typeof this.format === 'function') {
            return this.format(this.value);
        }
        
        // Default formatting by type
        switch (this.type) {
            case 'gauge':
                if (typeof this.value === 'number') {
                    return this.value.toFixed(1) + this.unit;
                }
                return this.value.toString() + this.unit;
                
            case 'switch':
            case 'indicator':
                return typeof this.value === 'boolean' ? 
                    (this.value ? 'ON' : 'OFF') : 
                    this.value.toString();
                    
            case 'text':
                return this.value.toString();
                
            default:
                return this.value.toString();
        }
    }

    // Format element for rendering with left/right alignment and colors
    render(maxWidth) {
        const availableWidth = Math.max(5, maxWidth - 2); // Account for padding
        let leftText = '';
        let rightText = '';
        
        switch (this.type) {
            case 'gauge':
                leftText = colorize(this.caption, THEMES.caption);
                rightText = this.renderGaugeValue();
                break;
                
            case 'switch':
                const switchDisplay = colorizeSwitch(this.value);
                leftText = colorize(this.caption, THEMES.caption);
                rightText = `${colorize(this.formatValue(), this.value ? THEMES.active : THEMES.inactive)} ${switchDisplay}`;
                break;
                
            case 'button':
                leftText = colorize(this.caption, THEMES.caption);
                rightText = colorize('[PRESS]', THEMES.active);
                break;
                
            case 'indicator':
                const indicator = colorizeIndicator(this.value);
                leftText = colorize(this.caption, THEMES.caption);
                rightText = `${this.renderIndicatorValue()} ${indicator}`;
                break;
                
            case 'text':
                leftText = colorize(this.caption, THEMES.caption);
                rightText = colorizeSystemState(this.formatValue());
                break;
                
            case 'sparkline':
                leftText = colorize(this.caption, THEMES.caption);
                rightText = colorize(this.generateSparkline(), THEMES.value);
                break;
                
            default:
                leftText = colorize(this.caption, THEMES.caption);
                rightText = colorize(this.formatValue(), THEMES.value);
        }
        
        return this.alignText(leftText, rightText, availableWidth);
    }

    // Render gauge value with appropriate coloring
    renderGaugeValue() {
        if (this.value === null || this.value === undefined) {
            return colorize('N/A', THEMES.inactive);
        }
        
        // Special handling for power values
        if (this.unit === 'W' || this.stateId?.includes('power') || this.stateId?.includes('Power')) {
            return colorizePower(this.value, this.unit);
        }
        
        // Default gauge coloring
        const formattedValue = this.formatValue();
        return colorize(formattedValue, THEMES.value);
    }

    // Render indicator value with state-based coloring
    renderIndicatorValue() {
        if (this.value === null || this.value === undefined) {
            return colorize('N/A', THEMES.inactive);
        }
        
        if (typeof this.value === 'boolean') {
            return colorize(this.value ? 'ON' : 'OFF', this.value ? THEMES.active : THEMES.inactive);
        }
        
        return colorizeSystemState(this.formatValue());
    }

    // Get visible length of text (excluding ANSI color codes)
    getVisibleLength(text) {
        // Remove ANSI color codes to get actual visible length
        return text.replace(/\x1b\[[0-9;]*m/g, '').length;
    }

    // Align text with caption left and value right
    alignText(leftText, rightText, maxWidth) {
        // Get visible lengths (excluding color codes)
        const rightTextLength = this.getVisibleLength(rightText);
        const leftTextLength = this.getVisibleLength(leftText);
        const maxLeftLength = Math.max(1, maxWidth - rightTextLength - 1);
        
        // Truncate left text if too long (preserve color codes)
        if (leftTextLength > maxLeftLength) {
            // This is tricky with colored text, for now just use original approach
            // TODO: Implement proper color-aware truncation
            const visiblePart = leftText.replace(/\x1b\[[0-9;]*m/g, '');
            if (visiblePart.length > maxLeftLength) {
                leftText = visiblePart.substring(0, maxLeftLength - 3) + '...';
            }
        }
        
        // Calculate spacing based on visible lengths
        const totalUsed = this.getVisibleLength(leftText) + rightTextLength;
        const spaces = Math.max(1, maxWidth - totalUsed);
        
        return leftText + ' '.repeat(spaces) + rightText;
    }

    // Generate simple sparkline representation
    generateSparkline() {
        // Placeholder sparkline - in real implementation, this would use historical data
        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        const length = 8;
        let sparkline = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            sparkline += chars[randomIndex];
        }
        
        return sparkline;
    }

    // Toggle switch (for interactive elements)
    async toggle() {
        if (!this.interactive || this.type !== 'switch' || !this.iobrokerClient) {
            return false;
        }
        
        try {
            const newValue = !this.value;
            await this.iobrokerClient.setState(this.stateId, newValue);
            // Value will be updated via state change event
            return true;
        } catch (error) {
            this.emit('error', error);
            return false;
        }
    }

    // Trigger button action
    async trigger() {
        if (!this.interactive || this.type !== 'button' || !this.iobrokerClient) {
            return false;
        }
        
        try {
            // For buttons, we typically set to true briefly or trigger a specific value
            await this.iobrokerClient.setState(this.stateId, true);
            
            // Emit button press event
            this.emit('buttonPressed', {
                element: this,
                timestamp: Date.now()
            });
            
            return true;
        } catch (error) {
            this.emit('error', error);
            return false;
        }
    }

    // Get element configuration for saving
    getConfig() {
        return {
            id: this.id,
            type: this.type,
            caption: this.caption,
            stateId: this.stateId,
            unit: this.unit,
            min: this.min,
            max: this.max,
            interactive: this.interactive
        };
    }

    // Check if element is connected and has recent data
    isHealthy() {
        if (!this.connected || !this.stateId) return false;
        
        // Consider element healthy if updated within last 5 minutes
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        return this.lastUpdate && this.lastUpdate > fiveMinutesAgo;
    }
}

// Factory function to create elements
export function createElement(config) {
    return new DashboardElement(config);
}

// Helper function to create multiple elements
export function createElements(configs) {
    return configs.map(config => createElement(config));
}

export default DashboardElement;