import { BaseCommand } from './base-command.js';
import IoBrokerClient from '../iobroker-client.js';

export class SetUrlCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'set-url';
    }

    get aliases() {
        return ['url'];
    }

    get description() {
        return 'Set ioBroker connection URL';
    }

    get usage() {
        return 'set-url <ip:port>';
    }

    get examples() {
        return [
            'set-url 192.168.1.100:8082',
            'set-url localhost:8082'
        ];
    }

    async execute(args) {
        if (args.length < 1) {
            this.dashboard.addErrorMessage('Usage: set-url <ip:port>');
            this.dashboard.addInfoMessage('Example: set-url 192.168.1.100:8082');
            return;
        }
        
        const urlInput = args[0];
        let newUrl;
        
        // Parse the input - add http:// if not present
        if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
            newUrl = `http://${urlInput}`;
        } else {
            newUrl = urlInput;
        }
        
        // Update config
        this.dashboard.config.iobrokerUrl = newUrl;
        this.dashboard.addSuccessMessage(`ioBroker URL set to: ${newUrl}`);
    }
}

export default SetUrlCommand;