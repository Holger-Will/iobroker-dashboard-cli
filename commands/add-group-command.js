import { BaseCommand } from './base-command.js';

export class AddGroupCommand extends BaseCommand {
    get name() {
        return 'add-group';
    }

    get aliases() {
        return ['ag', 'create-group'];
    }

    get description() {
        return 'Create a new dashboard group';
    }

    get usage() {
        return 'add-group <name>';
    }

    get examples() {
        return [
            'add-group "Solar System"',
            'ag Temperatures',
            'ag "Network Status"'
        ];
    }

    async run(args) {
        if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'connection') {
            this.error('Please complete connection setup first. Use "test-connection" or "skip-connection".');
            return;
        }

        const parsed = this.parseArgs(args);
        
        if (parsed.params.length === 0) {
            this.error(`Usage: ${this.usage}`);
            this.info('Examples:');
            this.examples.forEach(example => this.info(`  ${example}`));
            return;
        }

        const groupName = parsed.params.join(' ').replace(/['"]/g, '');
        
        try {
            const result = await this.tools.addGroup(groupName);
            
            if (result.success) {
                this.success(`Created group: ${groupName}`);
                
                // Force a complete re-render to show the new group
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderer.elementPositions.clear();
                
                this.render();
            } else {
                this.error(`Failed to create group: ${result.error}`);
            }
        } catch (error) {
            this.error(`Error creating group: ${error.message}`);
        }
    }
}

export default AddGroupCommand;