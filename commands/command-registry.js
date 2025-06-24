// Command registry to manage all available commands
import AddCommand from './add-command.js';
import LsCommand from './ls-command.js';
import QuitCommand from './quit-command.js';
import StatusCommand from './status-command.js';
import LoadCommand from './load-command.js';
import SaveCommand from './save-command.js';
import HelpCommand from './help-command.js';
import RenameCommand from './rename-command.js';
import ClearChatCommand from './clear-chat-command.js';
import ToggleModeCommand from './toggle-mode-command.js';
import ThemeCommand from './theme-command.js';
import MoveCommand from './move-command.js';

export class CommandRegistry {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.commands = new Map();
        this.aliases = new Map();
        
        this.registerDefaults();
    }

    registerDefaults() {
        // Register new flag-based commands
        this.register(new AddCommand(this.dashboard));
        this.register(new ToggleModeCommand(this.dashboard));
        this.register(new ThemeCommand(this.dashboard));
        this.register(new MoveCommand(this.dashboard));
        
        // Register remaining commands
        this.register(new LsCommand(this.dashboard));
        this.register(new QuitCommand(this.dashboard));
        this.register(new StatusCommand(this.dashboard));
        this.register(new LoadCommand(this.dashboard));
        this.register(new SaveCommand(this.dashboard));
        this.register(new HelpCommand(this.dashboard));
        this.register(new RenameCommand(this.dashboard));
        this.register(new ClearChatCommand(this.dashboard));
    }

    register(command) {
        // Register main command name
        this.commands.set(command.name, command);
        
        // Register all aliases
        command.aliases.forEach(alias => {
            this.aliases.set(alias, command);
        });
    }

    find(commandName) {
        // First check direct command names
        if (this.commands.has(commandName)) {
            return this.commands.get(commandName);
        }
        
        // Then check aliases
        if (this.aliases.has(commandName)) {
            return this.aliases.get(commandName);
        }
        
        return null;
    }

    async execute(commandName, args) {
        const command = this.find(commandName);
        
        if (!command) {
            this.dashboard.addErrorMessage(`Unknown command: ${commandName}. Type "help" for available commands.`);
            return false;
        }

        try {
            await command.execute(args);
            return true;
        } catch (error) {
            this.dashboard.addErrorMessage(`Error executing ${commandName}: ${error.message}`);
            return false;
        }
    }

    getAllCommands() {
        return Array.from(this.commands.values());
    }

    getCommandHelp() {
        const commands = this.getAllCommands();
        const helpData = [];

        commands.forEach(command => {
            const aliasText = command.aliases.length > 0 ? ` (${command.aliases.join(', ')})` : '';
            helpData.push([
                `${command.usage}${aliasText}`,
                command.description
            ]);
        });

        return helpData;
    }

    getCommandDetails(commandName) {
        const command = this.find(commandName);
        if (!command) return null;

        return {
            name: command.name,
            aliases: command.aliases,
            description: command.description,
            usage: command.usage,
            examples: command.examples
        };
    }
}

export default CommandRegistry;