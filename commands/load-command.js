import { BaseCommand } from './base-command.js';

export class LoadCommand extends BaseCommand {
    get name() {
        return 'load';
    }

    get aliases() {
        return ['ld', 'open'];
    }

    get description() {
        return 'Load a saved dashboard configuration';
    }

    get usage() {
        return '/load [-f <filename>] [-l] [-d <filename>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['f', 'l', 'd', 'h'],
            flags: {
                f: { type: 'string', description: 'Load specific filename' },
                l: { type: 'boolean', description: 'List available configurations' },
                d: { type: 'string', description: 'Set default configuration file' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/load                     # Load default configuration',
            '/load -f "dashboard1"     # Load dashboard1.json',
            '/load -f "backup.json"    # Load specific configuration',
            '/load -l                  # List available configurations',
            '/load -d "dashboard1"     # Set dashboard1.json as default'
        ];
    }

    async run(parsedArgs) {
        // Handle list flag
        if (parsedArgs.hasFlag('l')) {
            await this.listConfigurations();
            return;
        }

        // Handle set default flag
        if (parsedArgs.hasFlag('d')) {
            const defaultFile = parsedArgs.getFlag('d');
            await this.setDefaultConfiguration(defaultFile);
            return;
        }

        // Handle load file flag or default load
        let filename = parsedArgs.getFlag('f') || null; // null for default
        
        // Auto-append .json extension if not present
        if (filename && !filename.endsWith('.json')) {
            filename = filename + '.json';
        }
        
        try {
            // Load the configuration directly through config manager
            const result = await this.dashboard.configManager.load(filename);
            
            if (result.success) {
                // Reconnect elements to client
                await this.dashboard.connectElementsToClient();
                
                // Force a complete re-render by resetting the renderer
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderer.elementPositions.clear();
                
                // Now render the new dashboard
                this.render();
                this.success(`Loaded dashboard: ${result.filename}`);
                this.info(`[STATS] ${this.dashboard.layout.groups.length} groups with ${this.dashboard.layout.groups.reduce((sum, g) => sum + g.elements.length, 0)} elements`);
            } else {
                this.error(`Load failed: ${result.error}`);
            }
        } catch (error) {
            this.error(`Error loading configuration: ${error.message}`);
        }
    }

    async listConfigurations() {
        try {
            const result = await this.dashboard.configManager.listConfigs();
            
            if (!result.success) {
                this.error(`Error listing configurations: ${result.error}`);
                return;
            }
            
            const configs = result.configs;
            
            if (configs.length === 0) {
                this.warning('No saved configurations found.');
                this.info('Save current dashboard with: /save -f "filename"');
                return;
            }

            this.info('[CONFIGS] Available Configurations:');
            this.info('');
            
            configs.forEach((config, index) => {
                this.info(`  ${index + 1}. ${config.filename}`);
                if (config.created) {
                    this.info(`     Created: ${new Date(config.created).toLocaleString()}`);
                }
                if (config.updated) {
                    this.info(`     Updated: ${new Date(config.updated).toLocaleString()}`);
                }
                this.info(`     Groups: ${config.groupCount}, Elements: ${config.elementCount}`);
            });
            
            this.info('');
            this.info(`Total: ${configs.length} configurations`);
        } catch (error) {
            this.error(`Error listing configurations: ${error.message}`);
        }
    }

    async setDefaultConfiguration(filename) {
        try {
            if (!filename.endsWith('.json')) {
                filename = filename + '.json';
            }

            // Check if file exists first
            const result = await this.dashboard.configManager.listConfigs();
            if (!result.success) {
                this.error(`Error checking configurations: ${result.error}`);
                return;
            }
            const exists = result.configs.some(c => c.filename === filename);
            
            if (!exists) {
                this.error(`Configuration file not found: ${filename}`);
                this.info('Available configurations:');
                configs.forEach(c => this.info(`  - ${c.filename}`));
                return;
            }

            // Set as default (implementation depends on config manager)
            this.dashboard.configManager.config.defaultConfig = filename;
            this.success(`Set "${filename}" as default configuration`);
            this.info('New sessions will automatically load this configuration');
        } catch (error) {
            this.error(`Error setting default configuration: ${error.message}`);
        }
    }
}

export default LoadCommand;