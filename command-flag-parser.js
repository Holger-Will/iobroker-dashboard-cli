/**
 * Command Flag Parser for ioBroker Dashboard CLI
 * 
 * Parses flag-based commands like:
 * /add -g "Solar System" -s javascript.0.solar.produktion -n "PV Power" -t gauge
 * 
 * Features:
 * - Handles quoted arguments with spaces
 * - Supports optional flag values (e.g., -g vs -g <value>)
 * - Type-aware value parsing (strings, numbers, booleans, URLs)
 * - Error handling with helpful suggestions
 */

export class CommandFlagParser {
    constructor() {
        this.reset();
    }

    reset() {
        this.flags = new Map();
        this.positional = [];
        this.errors = [];
        this.command = '';
    }

    /**
     * Parse a command line with flags
     * @param {string} commandLine - Full command line to parse
     * @returns {Object} Parsed result with command, flags, positional args, errors
     */
    parse(commandLine) {
        this.reset();
        
        if (!commandLine || !commandLine.trim()) {
            this.errors.push('Empty command line');
            return this.getResult();
        }

        const tokens = this.tokenize(commandLine.trim());
        
        if (tokens.length === 0) {
            this.errors.push('No command found');
            return this.getResult();
        }

        // First token is the command (with or without /)
        this.command = tokens[0];
        
        // Parse remaining tokens as flags and values
        this.parseTokens(tokens.slice(1));
        
        return this.getResult();
    }

    /**
     * Tokenize command line, handling quoted strings properly
     * @param {string} commandLine - Command line to tokenize
     * @returns {Array<string>} Array of tokens
     */
    tokenize(commandLine) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        let i = 0;

        while (i < commandLine.length) {
            const char = commandLine[i];
            const nextChar = commandLine[i + 1];

            if ((char === '"' || char === "'") && !inQuotes) {
                // Start quoted string
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                // End quoted string
                inQuotes = false;
                quoteChar = '';
            } else if (char === '\\' && inQuotes && (nextChar === quoteChar || nextChar === '\\')) {
                // Handle escaped quotes and backslashes in quoted strings
                current += nextChar;
                i++; // Skip next character
            } else if (char === ' ' && !inQuotes) {
                // Space outside quotes - end current token
                if (current.trim()) {
                    tokens.push(current.trim());
                    current = '';
                }
            } else {
                // Regular character
                current += char;
            }
            i++;
        }

        // Add final token if any
        if (current.trim()) {
            tokens.push(current.trim());
        }

        // Check for unclosed quotes
        if (inQuotes) {
            this.errors.push(`Unclosed quote: ${quoteChar}`);
        }

        return tokens;
    }

    /**
     * Parse tokens into flags and positional arguments
     * @param {Array<string>} tokens - Tokens to parse
     */
    parseTokens(tokens) {
        let i = 0;
        
        while (i < tokens.length) {
            const token = tokens[i];
            
            if (token.startsWith('-')) {
                // This is a flag - handle both single (-f) and double (--flag) dash
                let flagName;
                if (token.startsWith('--')) {
                    flagName = token.substring(2);
                } else {
                    flagName = token.substring(1);
                }
                
                if (!flagName) {
                    this.errors.push('Empty flag name');
                    i++;
                    continue;
                }

                // Check if next token is a value (not a flag or end of tokens)
                const nextToken = tokens[i + 1];
                const hasValue = nextToken && !nextToken.startsWith('-');
                
                if (hasValue) {
                    // Flag with value: -f value
                    this.flags.set(flagName, this.parseValue(nextToken));
                    i += 2; // Skip flag and value
                } else {
                    // Flag without value (boolean flag): -g
                    this.flags.set(flagName, true);
                    i++; // Skip flag only
                }
            } else {
                // Positional argument
                this.positional.push(this.parseValue(token));
                i++;
            }
        }
    }

    /**
     * Parse a value with type inference
     * @param {string} value - Raw value to parse
     * @returns {*} Parsed value with appropriate type
     */
    parseValue(value) {
        if (!value || typeof value !== 'string') {
            return value;
        }

        // Boolean values
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;

        // Number values
        if (/^-?\d+$/.test(value)) {
            return parseInt(value, 10);
        }
        if (/^-?\d*\.\d+$/.test(value)) {
            return parseFloat(value);
        }

        // URL values
        if (/^https?:\/\//.test(value)) {
            try {
                return new URL(value);
            } catch {
                // If URL parsing fails, keep as string
            }
        }

        // JSON values (for complex parameters)
        if ((value.startsWith('{') && value.endsWith('}')) || 
            (value.startsWith('[') && value.endsWith(']'))) {
            try {
                return JSON.parse(value);
            } catch {
                // If JSON parsing fails, keep as string
            }
        }

        // Default: string value
        return value;
    }

    /**
     * Get the parsing result
     * @returns {Object} Result object
     */
    getResult() {
        return {
            command: this.command,
            flags: Object.fromEntries(this.flags),
            positional: this.positional,
            errors: this.errors,
            hasErrors: this.errors.length > 0,
            
            // Convenience methods
            getFlag: (name, defaultValue = undefined) => {
                return this.flags.has(name) ? this.flags.get(name) : defaultValue;
            },
            
            hasFlag: (name) => {
                return this.flags.has(name);
            },
            
            getPositional: (index, defaultValue = undefined) => {
                return index < this.positional.length ? this.positional[index] : defaultValue;
            }
        };
    }

    /**
     * Validate parsed result against a flag schema
     * @param {Object} result - Parsed result from parse()
     * @param {Object} schema - Flag schema definition
     * @returns {Object} Validation result with errors and warnings
     */
    static validate(result, schema) {
        const validation = {
            errors: [],
            warnings: [],
            isValid: true
        };

        // Check required flags
        if (schema.required) {
            for (const requiredFlag of schema.required) {
                if (!result.hasFlag(requiredFlag)) {
                    validation.errors.push(`Required flag missing: -${requiredFlag}`);
                    validation.isValid = false;
                }
            }
        }

        // Check unknown flags
        if (schema.knownFlags) {
            for (const flagName of Object.keys(result.flags)) {
                if (!schema.knownFlags.includes(flagName)) {
                    validation.warnings.push(`Unknown flag: -${flagName}`);
                }
            }
        }

        // Check flag types and constraints
        if (schema.flags) {
            for (const [flagName, flagConfig] of Object.entries(schema.flags)) {
                if (result.hasFlag(flagName)) {
                    const value = result.getFlag(flagName);
                    
                    // Type validation
                    if (flagConfig.type) {
                        if (!this.validateType(value, flagConfig.type)) {
                            validation.errors.push(`Flag -${flagName} should be type ${flagConfig.type}, got ${typeof value}`);
                            validation.isValid = false;
                        }
                    }
                    
                    // Enum validation
                    if (flagConfig.enum) {
                        if (!flagConfig.enum.includes(value)) {
                            validation.errors.push(`Flag -${flagName} must be one of: ${flagConfig.enum.join(', ')}`);
                            validation.isValid = false;
                        }
                    }
                }
            }
        }

        return validation;
    }

    /**
     * Validate value type
     * @param {*} value - Value to validate
     * @param {string} expectedType - Expected type
     * @returns {boolean} True if type matches
     */
    static validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number';
            case 'boolean':
                return typeof value === 'boolean';
            case 'url':
                return value instanceof URL || (typeof value === 'string' && /^https?:\/\//.test(value));
            case 'json':
                return typeof value === 'object' && value !== null;
            default:
                return true; // Unknown types pass validation
        }
    }

    /**
     * Format help text for a command with flags
     * @param {Object} schema - Command schema
     * @returns {string} Formatted help text
     */
    static formatHelp(schema) {
        if (!schema) return '';

        let help = '';
        
        if (schema.usage) {
            help += `Usage: ${schema.usage}\n\n`;
        }

        if (schema.description) {
            help += `${schema.description}\n\n`;
        }

        if (schema.flags) {
            help += 'Flags:\n';
            for (const [flagName, flagConfig] of Object.entries(schema.flags)) {
                const required = schema.required && schema.required.includes(flagName) ? ' (required)' : '';
                const type = flagConfig.type ? ` <${flagConfig.type}>` : '';
                const description = flagConfig.description || '';
                
                help += `  -${flagName}${type}${required}\n`;
                if (description) {
                    help += `    ${description}\n`;
                }
                
                if (flagConfig.enum) {
                    help += `    Options: ${flagConfig.enum.join(', ')}\n`;
                }
                help += '\n';
            }
        }

        if (schema.examples) {
            help += 'Examples:\n';
            for (const example of schema.examples) {
                help += `  ${example}\n`;
            }
        }

        return help;
    }
}

export default CommandFlagParser;