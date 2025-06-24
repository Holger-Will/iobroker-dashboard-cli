import { BaseCommand } from './base-command.js';

export class QuitCommand extends BaseCommand {
    get name() {
        return 'quit';
    }

    get aliases() {
        return ['q', 'exit'];
    }

    get description() {
        return 'Exit the dashboard application';
    }

    get usage() {
        return 'quit';
    }

    async run(args) {
        this.dashboard.stop();
    }
}

export default QuitCommand;