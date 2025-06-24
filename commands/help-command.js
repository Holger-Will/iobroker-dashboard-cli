import { BaseCommand } from './base-command.js';

export class HelpCommand extends BaseCommand {
    get name() {
        return 'help';
    }

    get aliases() {
        return ['h', '?'];
    }

    get description() {
        return 'Show help information';
    }

    get usage() {
        return 'help [command]';
    }

    get examples() {
        return [
            'help                    # Show all commands',
            'help list               # Show help for specific command',
            'h ag                    # Show help for add-group command'
        ];
    }

    async run(args) {
        const parsed = this.parseArgs(args);
        const commandName = parsed.params[0];

        if (commandName) {
            // Show help for specific command
            this.showCommandHelp(commandName);
        } else {
            // Show general help
            this.showGeneralHelp();
        }
    }

    showCommandHelp(commandName) {
        const command = this.dashboard.commands.find(commandName);
        
        if (!command) {
            this.error(`Unknown command: ${commandName}`);
            this.info('Use "help" to see all available commands.');
            return;
        }

        this.info(`📖 Help for: ${command.name}`);
        this.info(`Description: ${command.description}`);
        this.info(`Usage: ${command.usage}`);
        
        if (command.aliases.length > 0) {
            this.info(`Shortcuts: ${command.aliases.join(', ')}`);
        }
        
        if (command.examples.length > 0) {
            this.info('Examples:');
            command.examples.forEach(example => {
                this.info(`  ${example}`);
            });
        }
    }

    showGeneralHelp() {
        if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'connection') {
            this.info('📖 Connection setup commands:');
            this.dashboard.showCommandsInColumns([
                ['set-url <ip:port>', 'Set ioBroker URL'],
                ['test-connection', 'Test connection to ioBroker'],
                ['skip-connection', 'Continue with current settings'],
                ['help', 'Show this help'],
                ['exit', 'Exit without saving']
            ]);
        } else if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'dashboard') {
            this.info('📖 Dashboard setup commands:');
            this.dashboard.showCommandsInColumns([
                ['add-group <name> (ag)', 'Create a new group'],
                ['add-state <group> <type> <title> <stateId> (as)', 'Add element to monitor state'],
                ['list (ls)', 'List groups and elements'],
                ['save (sv)', 'Save dashboard and finish setup'],
                ['quit (q)', 'Exit without saving']
            ]);
            this.info('');
            this.info('💡 Quick start:');
            this.info('  1. ag "Solar System"                    # Create a group');
            this.info('  2. as Solar gauge "PV Power" solar.power # Add a gauge');
            this.info('  3. sv                                    # Save dashboard');
        } else {
            this.info('📖 Available commands:');
            
            // Get all registered commands
            const allCommands = this.dashboard.commands.getAllCommands();
            const registryCommands = allCommands.map(cmd => {
                const aliasText = cmd.aliases.length > 0 ? ` (${cmd.aliases.join(', ')})` : '';
                return [`${cmd.usage}${aliasText}`, cmd.description];
            });
            
            // Add remaining built-in commands not yet converted
            const builtInCommands = [
                ['set-url <ip:port>', 'Change ioBroker URL'],
                ['test-connection', 'Test ioBroker connection'],
                ['remove-element <group> [number]', 'Remove element (shows list if no number)'],
                ['remove-group [number]', 'Remove group (shows list if no number)']
            ];
            
            this.dashboard.showCommandsInColumns([...registryCommands, ...builtInCommands]);
            
            this.info('');
            this.info('💡 Tips:');
            this.info('  • Use arrow keys ↑↓ to scroll through messages');
            this.info('  • Use Tab to navigate interactive elements (buttons, switches)');
            this.info('  • Press Space to activate selected interactive element');
            this.info('  • Press Escape to deselect current element');
            this.info('  • Many commands have shortcuts (shown in parentheses)');
            this.info('  • Use -h or --help with any command for detailed help');
            this.info('  • Examples: "ls -h", "save --help", "ag -h"');
            
            if (this.dashboard.ai && this.dashboard.ai.isAvailable()) {
                this.info('');
                this.info('🤖 AI Assistant:');
                this.info('  • Ask questions in natural language');
                this.info('  • Example: "add a temperature sensor to my living room"');
                this.info('  • Example: "add javascript.0.temp.bedroom to my bedroom group"');
                this.info('  • Example: "show me all my switches"');
                this.info('  • Example: "create a group for my garden sensors"');
                this.info('  • Tip: Mention specific state IDs for automatic type detection');
            } else {
                this.info('');
                this.info('🤖 AI Assistant (disabled):');
                this.info('  • Set ANTHROPIC_API_KEY to enable natural language commands');
            }
        }
    }
}

export default HelpCommand;