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
        return 'save [filename]';
    }

    get examples() {
        return [
            'save                    # Save to default configuration',
            'save dashboard1         # Save as dashboard1.json (auto-adds .json)',
            'save dashboard1.json    # Save to specific file',
            'sv backup              # Save as backup.json (shortcut)'
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