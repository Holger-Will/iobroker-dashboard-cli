// Base class for all commands
import { CommandFlagParser } from '../command-flag-parser.js';

export class BaseCommand {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.tools = dashboard.tools;
        this.config = dashboard.config;
    }

    // Abstract methods to be implemented by subclasses
    get name() {
        throw new Error('Command must implement name getter');
    }

    get aliases() {
        return []; // Optional aliases/shortcuts
    }

    get description() {
        throw new Error('Command must implement description getter');
    }

    get usage() {
        return this.name; // Default usage is just the command name
    }

    get examples() {
        return []; // Optional usage examples
    }

    // Flag schema for validation (override in subclasses)
    get flagSchema() {
        return {
            knownFlags: ['h'],
            flags: {
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    // Check if this command can handle the given input
    canHandle(commandName) {
        return commandName === this.name || this.aliases.includes(commandName);
    }

    // Execute the command with given arguments (can be array or command line string)
    async execute(args) {
        let parsedArgs;
        
        if (typeof args === 'string') {
            // Parse command line string
            const parser = new CommandFlagParser();
            parsedArgs = parser.parse(`${this.name} ${args}`);
        } else {
            // Parse array of arguments
            const parser = new CommandFlagParser();
            let argsString = '';
            if (Array.isArray(args)) {
                // Properly quote arguments that contain spaces
                argsString = args.map(arg => {
                    if (typeof arg === 'string' && arg.includes(' ') && !arg.startsWith('"')) {
                        return `"${arg}"`;
                    }
                    return arg;
                }).join(' ');
            }
            parsedArgs = parser.parse(`${this.name} ${argsString}`);
        }

        // Check for parsing errors
        if (parsedArgs.hasErrors) {
            this.error('Command parsing failed:');
            parsedArgs.errors.forEach(error => this.error(`  ${error}`));
            return;
        }

        // Check for help flags first
        if (parsedArgs.hasFlag('h')) {
            this.showHelp();
            return;
        }

        // Validate against schema
        const validation = CommandFlagParser.validate(parsedArgs, this.flagSchema);
        if (!validation.isValid) {
            this.error('Invalid command:');
            validation.errors.forEach(error => this.error(`  ${error}`));
            if (validation.warnings.length > 0) {
                validation.warnings.forEach(warning => this.warning(`  ${warning}`));
            }
            this.info('Use -h for help');
            return;
        }

        // Show warnings but continue execution
        if (validation.warnings.length > 0) {
            validation.warnings.forEach(warning => this.warning(warning));
        }
        
        // Call the actual command implementation with parsed args
        await this.run(parsedArgs);
    }

    // Show help for this command
    showHelp() {
        const helpText = CommandFlagParser.formatHelp({
            usage: this.usage,
            description: this.description,
            ...this.flagSchema,
            examples: this.examples
        });
        
        this.info(`[HELP] Help for: ${this.name}`);
        if (this.aliases.length > 0) {
            this.info(`Aliases: ${this.aliases.join(', ')}`);
        }
        this.info('');
        this.info(helpText);
    }

    // Abstract method - commands should implement this instead of execute
    async run(args) {
        throw new Error('Command must implement run method');
    }

    // Helper methods for output
    success(message) {
        this.dashboard.addSuccessMessage(message);
    }

    error(message) {
        this.dashboard.addErrorMessage(message);
    }

    info(message) {
        this.dashboard.addInfoMessage(message);
    }

    warning(message) {
        this.dashboard.addWarningMessage(message);
    }

    // Helper to render dashboard
    render() {
        this.dashboard.renderDashboard();
    }

    // Helper to reload dashboard after changes
    async reload() {
        const reloadResult = await this.dashboard.configManager.load();
        if (reloadResult.success) {
            await this.dashboard.connectElementsToClient();
            this.render();
        }
        return reloadResult.success;
    }

    // Legacy parseArgs method for backward compatibility
    parseArgs(args) {
        const parsed = {
            flags: new Set(),
            params: [],
            options: {}
        };

        for (const arg of args) {
            if (arg.startsWith('-')) {
                // Handle flags like -g, -e, -eg
                const flagStr = arg.slice(1);
                for (const flag of flagStr) {
                    parsed.flags.add(flag);
                }
            } else {
                parsed.params.push(arg);
            }
        }

        return parsed;
    }

    // Helper methods for working with parsed flag arguments
    showUsageHelp() {
        this.error(`Usage: ${this.usage}`);
        this.info('Use -h for detailed help');
    }

    requireFlags(parsedArgs, requiredFlags) {
        const missing = requiredFlags.filter(flag => !parsedArgs.hasFlag(flag));
        if (missing.length > 0) {
            this.error(`Missing required flags: ${missing.map(f => `-${f}`).join(', ')}`);
            this.showUsageHelp();
            return false;
        }
        return true;
    }

    validateFlagValue(parsedArgs, flagName, expectedType) {
        if (!parsedArgs.hasFlag(flagName)) return true;
        
        const value = parsedArgs.getFlag(flagName);
        const actualType = typeof value;
        
        if (expectedType === 'string' && actualType !== 'string') {
            this.error(`Flag -${flagName} should be a string`);
            return false;
        }
        if (expectedType === 'number' && actualType !== 'number') {
            this.error(`Flag -${flagName} should be a number`);
            return false;
        }
        if (expectedType === 'boolean' && actualType !== 'boolean') {
            this.error(`Flag -${flagName} should be a boolean`);
            return false;
        }
        
        return true;
    }
}

export default BaseCommand;