import { BaseCommand } from './base-command.js';

export class ClearChatCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'clear-chat';
    }

    get aliases() {
        return ['clear-history', 'reset-chat'];
    }

    get description() {
        return 'Clear AI chat conversation history';
    }

    get usage() {
        return 'clear-chat';
    }

    get examples() {
        return [
            'clear-chat'
        ];
    }

    async execute(args) {
        if (this.dashboard.ai && this.dashboard.ai.isAvailable()) {
            this.dashboard.ai.clearChatHistory();
            this.dashboard.addSuccessMessage('🧹 Chat history cleared');
        } else {
            this.dashboard.addErrorMessage('AI not available');
        }
    }
}

export default ClearChatCommand;