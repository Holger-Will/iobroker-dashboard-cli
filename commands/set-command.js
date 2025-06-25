import { BaseCommand } from './base-command.js';

export class SetCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'set';
    }

    get aliases() {
        return ['config'];
    }

    get description() {
        return 'Get or set configuration values using dot notation';
    }

    get usage() {
        return '/set <key> [value] | /set -l | /set -h';
    }

    get flagSchema() {
        return {
            knownFlags: ['l', 'h'],
            flags: {
                l: { type: 'boolean', description: 'List all settings' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/set layout.columns 4',
            '/set layout.padding 2', 
            '/set theme.name dark',
            '/set -l',
            '/set layout.columns'
        ];
    }

    async run(parsedArgs) {
        if (parsedArgs.hasFlag('h')) {
            this.showHelp();
            return;
        }

        if (parsedArgs.hasFlag('l')) {
            await this.listAllSettings();
            return;
        }

        const args = parsedArgs.getPositionalArgs();
        
        if (args.length === 0) {
            this.error('Missing setting key. Use /set -h for help.');
            return;
        }

        const key = args[0];
        const value = args[1];

        if (value === undefined) {
            // Show current value
            await this.showCurrentValue(key);
        } else {
            // Set new value
            await this.setConfigValue(key, value);
        }
    }

    async listAllSettings() {
        this.info('Current configuration:');
        this.info('');
        
        // Group settings by category
        const categories = {
            'Layout': ['layout.columns', 'layout.padding', 'layout.rowSpacing', 'layout.showBorders', 'layout.responsive', 'layout.minGroupWidth'],
            'Theme': ['theme.name'],
            'Dashboard': ['dashboard.auto_save', 'dashboard.config_dir', 'dashboard.default_layout'],
            'ioBroker': ['iobroker.url', 'iobroker.namespace'],
            'MCP': ['mcp.server_url']
        };

        for (const [category, keys] of Object.entries(categories)) {
            this.info(`${category}:`);
            for (const key of keys) {
                if (this.dashboard.settings.has(key)) {
                    const value = this.dashboard.settings.get(key);
                    this.info(`  ${key} = ${JSON.stringify(value)}`);
                }
            }
            this.info('');
        }
    }

    async showCurrentValue(key) {
        if (!this.dashboard.settings.has(key)) {
            this.error(`Setting '${key}' not found`);
            return;
        }

        const value = this.dashboard.settings.get(key);
        this.info(`${key} = ${JSON.stringify(value)}`);
    }

    async setConfigValue(key, value) {
        try {
            // Validate the setting
            const validatedValue = this.validateSetting(key, value);
            
            // Set the value
            await this.dashboard.settings.set(key, validatedValue, true);
            
            // Apply side effects
            await this.applySideEffects(key, validatedValue);
            
            this.success(`Set ${key} = ${JSON.stringify(validatedValue)}`);
            
        } catch (error) {
            this.error(error.message);
        }
    }

    validateSetting(key, value) {
        const validators = {
            'layout.columns': (val) => {
                const num = parseInt(val);
                if (isNaN(num) || num < 1 || num > 8) {
                    throw new Error('Columns must be between 1 and 8');
                }
                
                // Check if this would result in groups too narrow
                this.checkGroupWidthWarning(num);
                
                return num;
            },
            
            'layout.padding': (val) => {
                const num = parseInt(val);
                if (isNaN(num) || num < 0 || num > 5) {
                    throw new Error('Padding must be between 0 and 5');
                }
                return num;
            },
            
            'layout.rowSpacing': (val) => {
                const num = parseInt(val);
                if (isNaN(num) || num < 0 || num > 5) {
                    throw new Error('Row spacing must be between 0 and 5');
                }
                return num;
            },
            
            'layout.showBorders': (val) => {
                if (val === 'true') return true;
                if (val === 'false') return false;
                throw new Error('Show borders must be true or false');
            },
            
            'layout.responsive': (val) => {
                if (val === 'true') return true;
                if (val === 'false') return false;
                throw new Error('Responsive must be true or false');
            },
            
            'theme.name': (val) => {
                const validThemes = ['default', 'dark', 'light', 'matrix', 'retro', 'ocean'];
                if (!validThemes.includes(val)) {
                    throw new Error(`Invalid theme. Valid themes: ${validThemes.join(', ')}`);
                }
                return val;
            }
        };

        const validator = validators[key];
        if (validator) {
            return validator(value);
        }

        // Default validation - try to parse as JSON, otherwise keep as string
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    checkGroupWidthWarning(columns) {
        const terminalWidth = process.stdout.columns || 80;
        const padding = this.dashboard.settings.get('layout.padding') || 1;
        const totalPadding = (columns - 1) * padding;
        const availableWidth = terminalWidth - totalPadding;
        const groupWidth = Math.floor(availableWidth / columns);
        
        if (groupWidth < 45) {
            this.warning(`WARNING: ${columns} columns results in ${groupWidth} chars per group (min 45 recommended)`);
        }
    }

    async applySideEffects(key, value) {
        // Layout changes trigger immediate updates
        if (key.startsWith('layout.')) {
            switch (key) {
                case 'layout.columns':
                    if (this.dashboard.layout && this.dashboard.layout.setColumns) {
                        this.dashboard.layout.setColumns(value);
                    }
                    break;
                case 'layout.padding':
                    if (this.dashboard.layout && this.dashboard.layout.setPadding) {
                        this.dashboard.layout.setPadding(value);
                    }
                    break;
                case 'layout.rowSpacing':
                    if (this.dashboard.layout && this.dashboard.layout.setRowSpacing) {
                        this.dashboard.layout.setRowSpacing(value);
                    }
                    break;
            }
            
            // Re-render dashboard for layout changes
            if (this.dashboard.renderDashboard) {
                this.dashboard.renderDashboard();
            }
        }
        
        // Theme changes apply immediately (handled by theme system)
        if (key === 'theme.name') {
            // Theme changes are handled by the theme command system
            // No additional side effects needed here
        }
    }

    showHelp() {
        this.info('Set or get configuration values using dot notation:');
        this.info('');
        this.info('Usage:');
        this.info('  /set <key> <value>    Set a configuration value');
        this.info('  /set <key>            Show current value');
        this.info('  /set -l               List all settings');
        this.info('  /set -h               Show this help');
        this.info('');
        this.info('Examples:');
        this.examples.forEach(example => {
            this.info(`  ${example}`);
        });
        this.info('');
        this.info('Common settings:');
        this.info('  layout.columns        Number of columns (1-8)');
        this.info('  layout.padding        Space between columns (0-5)');
        this.info('  layout.rowSpacing     Space between rows (0-5)');
        this.info('  theme.name            Color theme (default, dark, light, etc.)');
    }
}