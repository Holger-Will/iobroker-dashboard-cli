import { BaseCommand } from './base-command.js';

export class SkipConnectionCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'skip-connection';
    }

    get aliases() {
        return ['skip'];
    }

    get description() {
        return 'Skip connection setup and continue';
    }

    get usage() {
        return 'skip-connection';
    }

    get examples() {
        return [
            'skip-connection'
        ];
    }

    async execute(args) {
        if (this.dashboard.onboardingStep !== 'connection') {
            this.dashboard.addErrorMessage('This command is only available during connection setup.');
            return;
        }
        
        this.dashboard.startDashboardOnboarding();
    }
}

export default SkipConnectionCommand;