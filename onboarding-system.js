/**
 * New Production-Ready Onboarding System
 * Streamlined setup process for first-time users
 */

import { getAvailableSchemes, applyColorScheme, THEMES, COLORS } from './colors.js';

export class OnboardingSystem {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.settings = {}; // Temporary settings during onboarding
        this.currentStep = 'socketio-url';
        this.previewGroup = null;
    }

    async startOnboarding() {
        // Force command mode for onboarding
        this.dashboard.commandMode = true;
        this.dashboard.renderer.initialized = false;
        this.dashboard.renderer.elementPositions.clear();
        
        this.showWelcome();
        await this.askForSocketIOUrl();
    }

    showWelcome() {
        this.dashboard.addMessage('', 'info'); // Empty line
        this.dashboard.addMessage('Welcome to ioBroker Dashboard CLI!', 'success');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Let\'s set up your dashboard in a few quick steps:', 'info');
        this.dashboard.addMessage('  Step 1: Configure ioBroker connection', 'info');
        this.dashboard.addMessage('  Step 2: Choose your color theme', 'info');
        this.dashboard.addMessage('  Step 3: Set dashboard layout preferences', 'info');
        this.dashboard.addMessage('  Step 4: Configure AI features (optional)', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Note: You\'re currently in command mode - perfect for setup!', 'info');
        this.dashboard.addMessage('', 'info');
    }

    async askForSocketIOUrl() {
        this.currentStep = 'socketio-url';
        
        this.dashboard.addMessage('Step 1: ioBroker Connection', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Please enter your ioBroker Socket.IO URL:', 'info');
        this.dashboard.addMessage('Examples:', 'info');
        this.dashboard.addMessage('  • http://192.168.1.100:8082', 'info');
        this.dashboard.addMessage('  • http://localhost:8082', 'info');
        this.dashboard.addMessage('  • http://iobroker.local:8082', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Type the URL and press Enter:', 'warning');
        
        this.dashboard.updatePrompt();
        this.dashboard.renderDashboard();
    }

    async handleSocketIOUrlInput(url) {
        // Validate URL format
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                throw new Error('URL must use http:// or https://');
            }
        } catch (error) {
            this.dashboard.addMessage('Error: Invalid URL format. Please try again.', 'error');
            this.dashboard.addMessage('Example: http://192.168.1.100:8082', 'info');
            return false;
        }

        this.dashboard.addMessage(`Testing connection to: ${url}`, 'info');
        
        // Test the connection
        try {
            // Update the client URL and test connection
            this.dashboard.client.disconnect();
            this.dashboard.client.url = url;
            
            await this.dashboard.client.connect();
            
            this.settings.iobrokerUrl = url;
            this.dashboard.addMessage('Success: Connection successful!', 'success');
            this.dashboard.addMessage('', 'info');
            
            await this.askForColorScheme();
            return true;
        } catch (error) {
            this.dashboard.addMessage(`Error: Connection failed: ${error.message}`, 'error');
            this.dashboard.addMessage('Please check the URL and try again:', 'warning');
            return false;
        }
    }

    async askForColorScheme() {
        this.currentStep = 'color-scheme';
        
        this.dashboard.addMessage('Step 2: Choose Your Color Theme', 'info');
        this.dashboard.addMessage('', 'info');
        
        const schemes = getAvailableSchemes();
        this.dashboard.addMessage('Available themes:', 'info');
        
        schemes.forEach((scheme, index) => {
            const description = this.getSchemeDescription(scheme);
            this.dashboard.addMessage(`  ${index + 1}. ${scheme} - ${description}`, 'info');
        });
        
        this.dashboard.addMessage('', 'info');
        this.showColorPreview('default'); // Show default preview initially
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Type theme name or number and press Enter:', 'warning');
        this.dashboard.addMessage('Tip: Try typing different theme names to see previews!', 'info');
    }

    showColorPreview(schemeName) {
        // Temporarily apply the scheme for preview
        const originalScheme = Object.assign({}, THEMES);
        applyColorScheme(schemeName);
        
        this.dashboard.addMessage(`Preview of "${schemeName}" theme:`, 'info');
        
        // Create a sample group preview using the current theme colors
        const previewLines = [
            `${THEMES.border}╭[Sample Group]${'─'.repeat(25)}╮${COLORS.reset}`,
            `${THEMES.border}│${COLORS.reset} ${THEMES.caption}Solar Power${COLORS.reset}                  ${THEMES.value}1250${THEMES.unit}W${COLORS.reset} ${THEMES.border}│${COLORS.reset}`,
            `${THEMES.border}│${COLORS.reset} ${THEMES.caption}Battery Level${COLORS.reset}               ${THEMES.active}85%${COLORS.reset} ${THEMES.border}│${COLORS.reset}`,
            `${THEMES.border}│${COLORS.reset} ${THEMES.caption}Grid Status${COLORS.reset}                 ${THEMES.positive}ON${COLORS.reset} ${THEMES.active}●${COLORS.reset} ${THEMES.border}│${COLORS.reset}`,
            `${THEMES.border}╰${'─'.repeat(37)}╯${COLORS.reset}`
        ];
        
        previewLines.forEach(line => {
            this.dashboard.addMessage(line, 'info');
        });
        
        // Restore original scheme
        Object.assign(THEMES, originalScheme);
    }

    async handleColorSchemeInput(input) {
        const schemes = getAvailableSchemes();
        let selectedScheme = null;
        
        // Check if input is a number
        const num = parseInt(input);
        if (!isNaN(num) && num >= 1 && num <= schemes.length) {
            selectedScheme = schemes[num - 1];
        } else if (schemes.includes(input.toLowerCase())) {
            selectedScheme = input.toLowerCase();
        } else {
            // Show preview for partial matches or invalid input
            const match = schemes.find(s => s.startsWith(input.toLowerCase()));
            if (match) {
                this.showColorPreview(match);
                this.dashboard.addMessage(`Tip: Did you mean "${match}"? Type the full name to select.`, 'info');
                return false; // Don't proceed, just show preview
            } else {
                this.dashboard.addMessage('Error: Invalid theme. Please try again.', 'error');
                this.dashboard.addMessage('Available: ' + schemes.join(', '), 'info');
                return false;
            }
        }
        
        this.settings.colorScheme = selectedScheme;
        applyColorScheme(selectedScheme);
        
        // Force re-render with new colors
        this.dashboard.renderer.initialized = false;
        this.dashboard.renderer.elementPositions.clear();
        
        this.dashboard.addMessage(`Success: Applied "${selectedScheme}" theme!`, 'success');
        this.dashboard.addMessage('', 'info');
        
        await this.askForGroupWidth();
        return true;
    }

    async askForGroupWidth() {
        this.currentStep = 'group-width';
        
        this.dashboard.addMessage('Step 3: Dashboard Layout', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('What should be the default width for dashboard groups?', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Recommended widths:', 'info');
        this.dashboard.addMessage('  • 59 - Standard (recommended for 240-char screens)', 'info');
        this.dashboard.addMessage('  • 50 - Compact (fits more groups)', 'info');
        this.dashboard.addMessage('  • 70 - Wide (more space for long names)', 'info');
        this.dashboard.addMessage('  • 35 - Legacy (for smaller screens)', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Enter width (or press Enter for 59):', 'warning');
    }

    async handleGroupWidthInput(input) {
        let width = 59; // default
        
        if (input.trim()) {
            const num = parseInt(input);
            if (isNaN(num) || num < 20 || num > 80) {
                this.dashboard.addMessage('Error: Width must be between 20 and 80. Please try again.', 'error');
                return false;
            }
            width = num;
        }
        
        this.settings.groupWidth = width;
        this.dashboard.addMessage(`Success: Set group width to ${width} characters`, 'success');
        this.dashboard.addMessage('', 'info');
        
        await this.askForAISupport();
        return true;
    }

    async askForAISupport() {
        this.currentStep = 'ai-support';
        
        this.dashboard.addMessage('Step 4: AI Assistant (Optional)', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Enable AI assistant for natural language commands?', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('With AI enabled, you can use commands like:', 'info');
        this.dashboard.addMessage('  • "show me the solar power"', 'info');
        this.dashboard.addMessage('  • "add a temperature sensor"', 'info');
        this.dashboard.addMessage('  • "what\'s the status of the heating system"', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Enable AI? (y/n or press Enter for no):', 'warning');
    }

    async handleAISupportInput(input) {
        const enable = input.toLowerCase().startsWith('y');
        
        if (enable) {
            this.dashboard.addMessage('Please enter your Anthropic API key:', 'info');
            this.dashboard.addMessage('(Get one at: https://console.anthropic.com/)', 'info');
            this.dashboard.addMessage('', 'info');
            this.dashboard.addMessage('Enter API key:', 'warning');
            this.currentStep = 'ai-api-key';
        } else {
            this.settings.aiEnabled = false;
            this.dashboard.addMessage('Success: AI assistant disabled', 'success');
            this.dashboard.addMessage('Note: You can enable it later with environment variables', 'info');
            this.dashboard.addMessage('', 'info');
            
            await this.completeOnboarding();
        }
        
        return true;
    }

    async handleAIApiKeyInput(input) {
        if (!input.trim() || input.length < 20) {
            this.dashboard.addMessage('Error: API key seems too short. Please try again.', 'error');
            return false;
        }
        
        this.settings.aiEnabled = true;
        this.settings.anthropicApiKey = input.trim();
        this.dashboard.addMessage('Success: AI API key configured', 'success');
        this.dashboard.addMessage('', 'info');
        
        await this.askForMCPSupport();
        return true;
    }

    async askForMCPSupport() {
        this.currentStep = 'mcp-support';
        
        this.dashboard.addMessage('Model Context Protocol (MCP)', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Enable MCP for enhanced AI integration with ioBroker?', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('MCP provides the AI with direct access to:', 'info');
        this.dashboard.addMessage('  • Read/write ioBroker states', 'info');
        this.dashboard.addMessage('  • Browse adapter configurations', 'info');
        this.dashboard.addMessage('  • Execute advanced automation', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Enable MCP? (y/n or press Enter for no):', 'warning');
    }

    async handleMCPSupportInput(input) {
        const enable = input.toLowerCase().startsWith('y');
        
        if (enable) {
            this.dashboard.addMessage('Please enter your MCP server URL:', 'info');
            this.dashboard.addMessage('Example: http://192.168.1.100:8082/mcp', 'info');
            this.dashboard.addMessage('', 'info');
            this.dashboard.addMessage('Enter MCP URL:', 'warning');
            this.currentStep = 'mcp-url';
        } else {
            this.settings.mcpEnabled = false;
            this.dashboard.addMessage('Success: MCP disabled', 'success');
            this.dashboard.addMessage('', 'info');
            
            await this.completeOnboarding();
        }
        
        return true;
    }

    async handleMCPUrlInput(input) {
        try {
            const urlObj = new URL(input);
            if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                throw new Error('URL must use http:// or https://');
            }
        } catch (error) {
            this.dashboard.addMessage('Error: Invalid URL format. Please try again.', 'error');
            this.dashboard.addMessage('Example: http://192.168.1.100:8082/mcp', 'info');
            return false;
        }
        
        this.settings.mcpEnabled = true;
        this.settings.mcpUrl = input.trim();
        this.dashboard.addMessage('Success: MCP URL configured', 'success');
        this.dashboard.addMessage('', 'info');
        
        await this.completeOnboarding();
        return true;
    }

    async completeOnboarding() {
        this.dashboard.addMessage('Setup Complete!', 'success');
        this.dashboard.addMessage('', 'info');
        
        // Apply all settings
        await this.applySettings();
        
        // Show summary
        this.dashboard.addMessage('Your Configuration:', 'info');
        this.dashboard.addMessage(`  ioBroker: ${this.settings.iobrokerUrl}`, 'info');
        this.dashboard.addMessage(`  Theme: ${this.settings.colorScheme}`, 'info');
        this.dashboard.addMessage(`  Group Width: ${this.settings.groupWidth}`, 'info');
        this.dashboard.addMessage(`  AI Assistant: ${this.settings.aiEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        if (this.settings.aiEnabled) {
            this.dashboard.addMessage(`  MCP: ${this.settings.mcpEnabled ? 'Enabled' : 'Disabled'}`, 'info');
        }
        this.dashboard.addMessage('', 'info');
        
        // Give next steps
        this.dashboard.addMessage('Ready to go! Here\'s what you can do:', 'info');
        this.dashboard.addMessage('  • /add -c -g "My Group" - Create your first group', 'info');
        this.dashboard.addMessage('  • /add -g "My Group" -n "Sensor" -s state.id - Add elements', 'info');
        this.dashboard.addMessage('  • /theme -l - Try different color themes', 'info');
        this.dashboard.addMessage('  • ESC - Toggle between dashboard and command mode', 'info');
        this.dashboard.addMessage('  • /help - Show all available commands', 'info');
        this.dashboard.addMessage('', 'info');
        this.dashboard.addMessage('Tip: Press ESC to switch to dashboard mode and start building!', 'warning');
        
        // Mark onboarding as complete
        this.dashboard.isOnboarding = false;
        this.dashboard.onboardingStep = 'complete';
    }

    async applySettings() {
        // Apply ioBroker URL
        this.dashboard.config.iobrokerUrl = this.settings.iobrokerUrl;
        
        // Apply group width
        this.dashboard.config.groupWidth = this.settings.groupWidth;
        this.dashboard.layout.config.groupWidth = this.settings.groupWidth;
        
        // Apply color scheme (already applied during selection)
        
        // Apply AI settings
        if (this.settings.aiEnabled) {
            process.env.ANTHROPIC_API_KEY = this.settings.anthropicApiKey;
            if (this.dashboard.ai) {
                await this.dashboard.ai.initialize();
            }
            
            if (this.settings.mcpEnabled) {
                process.env.MCP_SERVER_URL = this.settings.mcpUrl;
                if (this.dashboard.mcp) {
                    this.dashboard.mcp.serverUrl = this.settings.mcpUrl;
                    try {
                        await this.dashboard.mcp.connect();
                    } catch (error) {
                        this.dashboard.addMessage(`Warning: MCP connection failed: ${error.message}`, 'warning');
                    }
                }
            }
        }
        
        // Create initial dashboard configuration
        await this.dashboard.configManager.save('onboarding.json');
        this.dashboard.addMessage('Configuration saved to onboarding.json', 'success');
    }

    getSchemeDescription(scheme) {
        const descriptions = {
            default: 'Classic blue/green with rounded borders',
            dark: 'High contrast dark theme with bright colors',
            light: 'Light theme with dark text',
            matrix: 'Green matrix-style with thick borders',
            retro: 'Orange/brown retro with double borders',
            ocean: 'Blue/cyan ocean theme'
        };
        
        return descriptions[scheme] || 'Custom theme';
    }

    // Handle input during onboarding
    async handleInput(input) {
        switch (this.currentStep) {
            case 'socketio-url':
                return await this.handleSocketIOUrlInput(input);
            case 'color-scheme':
                return await this.handleColorSchemeInput(input);
            case 'group-width':
                return await this.handleGroupWidthInput(input);
            case 'ai-support':
                return await this.handleAISupportInput(input);
            case 'ai-api-key':
                return await this.handleAIApiKeyInput(input);
            case 'mcp-support':
                return await this.handleMCPSupportInput(input);
            case 'mcp-url':
                return await this.handleMCPUrlInput(input);
            default:
                return false;
        }
    }
}

export default OnboardingSystem;