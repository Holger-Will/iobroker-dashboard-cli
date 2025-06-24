import { BaseCommand } from './base-command.js';

export class SaveCommand extends BaseCommand {
    get name() {
        return 'save';
    }

    get aliases() {
        return ['sv'];
    }

    get description() {
        return 'Save current dashboard configuration';
    }

    get usage() {
        return '/save [-f <filename>] [-d]';
    }

    get flagSchema() {
        return {
            knownFlags: ['f', 'd', 'h'],
            flags: {
                f: { type: 'string', description: 'Save to specific filename' },
                d: { type: 'boolean', description: 'Save as default configuration' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/save                     # Save to current configuration',
            '/save -f "dashboard1"     # Save as dashboard1.json',
            '/save -f "backup.json"    # Save to specific file',
            '/save -d                  # Save as default configuration',
            '/save -f "new" -d         # Save as new.json and set as default'
        ];
    }

    async run(parsedArgs) {
        let filename = parsedArgs.getFlag('f') || null; // null for current config
        const setDefault = parsedArgs.hasFlag('d');
        
        // Auto-append .json extension if not present
        if (filename && !filename.endsWith('.json')) {
            filename = filename + '.json';
        }
        
        try {
            const result = await this.tools.saveLayout(filename);
            
            if (result.success) {
                this.success(`Saved to: ${result.filename}`);
                
                // Check if this completes onboarding
                if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'dashboard' && this.dashboard.layout.groups.length > 0) {
                    await this.dashboard.finishOnboarding();
                }
            } else {
                this.error(`Save failed: ${result.error}`);
            }
        } catch (error) {
            this.error(`Error saving configuration: ${error.message}`);
        }
    }
}

export default SaveCommand;