import { BaseCommand } from './base-command.js';

export class StatusCommand extends BaseCommand {
    get name() {
        return 'status';
    }

    get aliases() {
        return ['st', 'info'];
    }

    get description() {
        return 'Show dashboard status and statistics';
    }

    get usage() {
        return 'status';
    }

    async run(args) {
        try {
            const status = this.tools.getStatus();
            
            this.info('[STATUS] Dashboard Status:');
            this.info(`  Connection: ${this.dashboard.connected ? '[CONNECTED]' : '[DISCONNECTED]'}`);
            this.info(`  ioBroker URL: ${this.config.iobrokerUrl}`);
            this.info(`  Groups: ${status.groups}`);
            this.info(`  Total Elements: ${status.totalElements}`);
            this.info(`  Layout: ${status.layout.columns} columns, Height: ${status.layout.totalHeight}`);
            this.info(`  Terminal Size: ${status.layout.terminalSize}`);
            this.info(`  Scrolling: ${status.layout.needsScrolling ? 'Required' : 'Not needed'}`);
            
            if (status.config) {
                this.info(`  Current Layout: ${status.config.currentLayout || 'No layout loaded'}`);
                this.info(`  Unsaved Changes: ${status.config.isDirty ? 'Yes' : 'No'}`);
                
                // Show last used dashboard from settings
                try {
                    const settings = await this.dashboard.configManager.loadSettings();
                    this.info(`  Last Used: ${settings.lastUsedDashboard || 'default.json'}`);
                } catch (error) {
                    // Ignore settings load errors
                }
            }
        } catch (error) {
            this.error(`Error getting status: ${error.message}`);
        }
    }
}

export default StatusCommand;