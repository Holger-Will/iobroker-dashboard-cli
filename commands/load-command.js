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
        return 'load [filename]';
    }

    get examples() {
        return [
            'load                    # Load default configuration',
            'load dashboard1         # Load dashboard1.json (auto-adds .json)',
            'load dashboard1.json    # Load specific configuration',
            'ld backup              # Load backup.json (shortcut)'
        ];
    }

    async run(args) {
        const parsed = this.parseArgs(args);
        let filename = parsed.params[0]; // Optional filename
        
        // Auto-append .json extension if not present
        if (filename && !filename.endsWith('.json')) {
            filename = filename + '.json';
        }
        
        try {
            // Load the configuration directly through config manager
            const result = await this.dashboard.configManager.load(filename);
            
            if (result.success) {
                // Reconnect elements to client
                this.dashboard.connectElementsToClient();
                
                // Force a complete re-render by resetting the renderer
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderer.elementPositions.clear();
                
                // Now render the new dashboard
                this.render();
                this.success(`Loaded dashboard: ${result.filename}`);
                this.info(`📊 ${this.dashboard.layout.groups.length} groups with ${this.dashboard.layout.groups.reduce((sum, g) => sum + g.elements.length, 0)} elements`);
            } else {
                this.error(`Load failed: ${result.error}`);
            }
        } catch (error) {
            this.error(`Error loading configuration: ${error.message}`);
        }
    }
}

export default LoadCommand;