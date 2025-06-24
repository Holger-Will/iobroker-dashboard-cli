import { BaseCommand } from './base-command.js';
import IoBrokerClient from '../iobroker-client.js';

export class TestConnectionCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'test-connection';
    }

    get aliases() {
        return ['test', 'ping'];
    }

    get description() {
        return 'Test connection to ioBroker server';
    }

    get usage() {
        return 'test-connection';
    }

    get examples() {
        return [
            'test-connection'
        ];
    }

    async execute(args) {
        try {
            this.dashboard.addInfoMessage('Testing connection...');
            
            // Disconnect current client if connected
            if (this.dashboard.client && this.dashboard.connected) {
                this.dashboard.client.disconnect();
            }
            
            // Create new client with updated URL
            this.dashboard.client = new IoBrokerClient({
                url: this.dashboard.config.iobrokerUrl
            });
            
            // Set up temporary event handlers for testing
            const testTimeout = setTimeout(() => {
                this.dashboard.addErrorMessage(`Connection timeout. Please check the URL: ${this.dashboard.config.iobrokerUrl}`);
            }, 10000);
            
            this.dashboard.client.once('connected', () => {
                clearTimeout(testTimeout);
                this.dashboard.addSuccessMessage('✅ Connection successful!');
                if (this.dashboard.isOnboarding) {
                    this.dashboard.addInfoMessage('Use "skip-connection" to continue with dashboard setup.');
                }
            });
            
            this.dashboard.client.once('error', (error) => {
                clearTimeout(testTimeout);
                this.dashboard.addErrorMessage(`Connection failed: ${error.message}`);
                this.dashboard.addInfoMessage('Please check your URL and try again.');
            });
            
            await this.dashboard.client.connect();
            
        } catch (error) {
            this.dashboard.addErrorMessage(`Connection error: ${error.message}`);
        }
    }
}

export default TestConnectionCommand;