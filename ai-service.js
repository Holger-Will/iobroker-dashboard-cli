import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

class AIService {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.anthropic = null;
        this.initialized = false;
        this.chatHistory = []; // Store conversation history
        this.maxHistoryLength = 20; // Keep last 20 exchanges
        
        // Load environment variables from .env file
        dotenv.config();
        
        // Initialize if API key is available
        this.initialize();
    }

    initialize() {
        const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        
        if (!apiKey) {
            console.log('💡 AI features disabled - set ANTHROPIC_API_KEY environment variable to enable AI assistance');
            return;
        }

        try {
            this.anthropic = new Anthropic({
                apiKey: apiKey
            });
            this.initialized = true;
            console.log('🤖 AI assistant enabled');
        } catch (error) {
            console.error('Failed to initialize AI service:', error.message);
        }
    }

    isAvailable() {
        return this.initialized && this.anthropic;
    }

    addToChatHistory(messages) {
        // Add new messages to history
        this.chatHistory.push(...messages);
        
        // Keep only the most recent exchanges to prevent context overflow
        if (this.chatHistory.length > this.maxHistoryLength) {
            // Remove oldest messages but keep pairs (user + assistant)
            const excessMessages = this.chatHistory.length - this.maxHistoryLength;
            this.chatHistory = this.chatHistory.slice(excessMessages);
        }
    }

    clearChatHistory() {
        this.chatHistory = [];
    }

    getChatHistoryLength() {
        return this.chatHistory.length;
    }

    async processNaturalLanguageQuery(userInput) {
        if (!this.isAvailable()) {
            return {
                success: false,
                error: 'AI service not available. Set ANTHROPIC_API_KEY environment variable.'
            };
        }

        try {
            const dashboardContext = this.getDashboardContext();
            
            // Look for potential state IDs in the user input and fetch their metadata
            const stateMetadata = await this.extractAndFetchStateMetadata(userInput);
            
            const systemPrompt = this.buildSystemPrompt(dashboardContext);
            let enhancedUserInput = userInput;
            
            // Add state metadata context if we found any
            if (stateMetadata.length > 0) {
                enhancedUserInput += '\n\nState metadata found:\n';
                stateMetadata.forEach(meta => {
                    if (meta.exists) {
                        enhancedUserInput += `- ${meta.stateId}: type=${meta.type}, role=${meta.role}`;
                        if (meta.unit) enhancedUserInput += `, unit=${meta.unit}`;
                        if (meta.min !== undefined) enhancedUserInput += `, min=${meta.min}`;
                        if (meta.max !== undefined) enhancedUserInput += `, max=${meta.max}`;
                        if (meta.write !== undefined) enhancedUserInput += `, writable=${meta.write}`;
                        enhancedUserInput += '\n';
                    } else {
                        enhancedUserInput += `- ${meta.stateId}: NOT FOUND\n`;
                    }
                });
            }
            
            // Prepare MCP tools for Claude if available
            let tools = [];
            if (this.dashboard.mcp && this.dashboard.mcp.isConnected()) {
                const mcpTools = this.dashboard.mcp.getAvailableTools();
                tools = mcpTools.map(tool => ({
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema
                }));
            }

            // Build messages with chat history
            const messages = [...this.chatHistory, {
                role: 'user',
                content: enhancedUserInput
            }];

            const response = await this.anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                system: systemPrompt,
                tools: tools.length > 0 ? tools : undefined,
                messages: messages
            });

            // Handle tool calls if Claude wants to use MCP tools
            let toolResults = [];
            let finalResponse = '';
            
            if (response.content.some(content => content.type === 'tool_use')) {
                // Process tool calls - use the same messages array and add assistant response
                messages.push({
                    role: 'assistant',
                    content: response.content
                });

                // Execute each tool call
                for (const content of response.content) {
                    if (content.type === 'tool_use') {
                        try {
                            const toolResult = await this.dashboard.mcp.callTool(
                                content.name,
                                content.input
                            );
                            
                            toolResults.push({
                                tool: content.name,
                                input: content.input,
                                result: toolResult
                            });

                            messages.push({
                                role: 'user',
                                content: [{
                                    type: 'tool_result',
                                    tool_use_id: content.id,
                                    content: JSON.stringify(toolResult.result)
                                }]
                            });
                        } catch (error) {
                            messages.push({
                                role: 'user',
                                content: [{
                                    type: 'tool_result',
                                    tool_use_id: content.id,
                                    content: `Error: ${error.message}`,
                                    is_error: true
                                }]
                            });
                        }
                    }
                }

                // Get Claude's final response after tool execution
                const finalApiResponse = await this.anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 1000,
                    system: systemPrompt,
                    tools: tools.length > 0 ? tools : undefined,
                    messages: messages
                });

                finalResponse = finalApiResponse.content[0]?.text || 'Tool execution completed.';
            } else {
                finalResponse = response.content[0]?.text || 'No response generated.';
            }
            
            // Parse the final response to extract any dashboard commands
            const parsedResponse = this.parseAIResponse(finalResponse);
            
            // Add to chat history
            this.addToChatHistory([
                { role: 'user', content: enhancedUserInput },
                { role: 'assistant', content: finalResponse }
            ]);
            
            return {
                success: true,
                response: finalResponse,
                toolResults: toolResults,
                commands: parsedResponse.commands,
                explanation: parsedResponse.explanation
            };

        } catch (error) {
            return {
                success: false,
                error: `AI processing failed: ${error.message}`
            };
        }
    }

    async extractAndFetchStateMetadata(userInput) {
        // Look for potential state IDs in the format: adapter.instance.path
        const stateIdPattern = /\b[a-zA-Z0-9_-]+\.\d+\.[a-zA-Z0-9_.-]+/g;
        const potentialStateIds = userInput.match(stateIdPattern) || [];
        
        const metadata = [];
        
        if (potentialStateIds.length > 0 && this.dashboard.client && this.dashboard.client.isConnected()) {
            for (const stateId of potentialStateIds) {
                try {
                    const meta = await this.getStateMetadata(stateId);
                    metadata.push({ stateId, ...meta });
                } catch (error) {
                    metadata.push({ stateId, exists: false, error: error.message });
                }
            }
        }
        
        return metadata;
    }

    getDashboardContext() {
        const groups = this.dashboard.tools.listGroups();
        const status = this.dashboard.tools.getStatus();
        const connected = this.dashboard.connected;
        const mcpConnected = this.dashboard.mcp && this.dashboard.mcp.isConnected();

        const context = {
            connected,
            groups,
            status,
            availableCommands: this.getAvailableCommands(),
            hasIoBrokerAccess: connected && this.dashboard.client,
            mcpConnected,
            hasMCPAccess: mcpConnected
        };

        // Add MCP tools and resources if available
        if (mcpConnected) {
            context.mcpTools = this.dashboard.mcp.getAvailableTools();
            context.mcpResources = this.dashboard.mcp.getAvailableResources();
        }

        return context;
    }

    async getStateMetadata(stateId) {
        // Try MCP first if available for richer metadata
        if (this.dashboard.mcp && this.dashboard.mcp.isConnected()) {
            try {
                const mcpResult = await this.dashboard.mcp.getEnhancedStateMetadata(stateId);
                if (mcpResult.exists) {
                    return {
                        source: 'mcp',
                        exists: true,
                        common: mcpResult.common,
                        type: mcpResult.type,
                        role: mcpResult.role,
                        unit: mcpResult.unit,
                        min: mcpResult.min,
                        max: mcpResult.max,
                        write: mcpResult.write,
                        name: mcpResult.name,
                        desc: mcpResult.desc
                    };
                }
            } catch (error) {
                console.warn(`MCP metadata lookup failed for ${stateId}:`, error.message);
            }
        }

        // Fallback to direct ioBroker client
        if (this.dashboard.client && this.dashboard.client.isConnected()) {
            try {
                const objData = await this.dashboard.client.getObject(stateId);
                return {
                    source: 'direct',
                    exists: !!objData,
                    common: objData?.common,
                    type: objData?.common?.type,
                    role: objData?.common?.role,
                    unit: objData?.common?.unit,
                    min: objData?.common?.min,
                    max: objData?.common?.max,
                    write: objData?.common?.write,
                    name: objData?.common?.name,
                    desc: objData?.common?.desc
                };
            } catch (error) {
                return {
                    source: 'direct',
                    exists: false,
                    error: error.message
                };
            }
        }

        throw new Error('No ioBroker connection available');
    }

    async searchStates(pattern) {
        if (!this.dashboard.client || !this.dashboard.client.isConnected()) {
            return { error: 'Not connected to ioBroker' };
        }

        // This is a simplified search - in a real implementation, you might want to
        // add a searchStates method to the ioBroker client
        try {
            // For now, return some common patterns based on the search term
            const commonStates = [
                'javascript.0.',
                'modbus.0.',
                'system.adapter.',
                'ping.0.',
                'hm-rpc.0.',
                'mqtt.0.'
            ];

            const suggestions = commonStates
                .filter(prefix => pattern.toLowerCase().includes(prefix.split('.')[0]))
                .map(prefix => `${prefix}${pattern.toLowerCase()}`);

            return { suggestions };
        } catch (error) {
            return { error: error.message };
        }
    }

    getAvailableCommands() {
        const commands = this.dashboard.commands.getAllCommands();
        return commands.map(cmd => ({
            name: cmd.name,
            aliases: cmd.aliases,
            description: cmd.description,
            usage: cmd.usage
        }));
    }

    buildSystemPrompt(context) {
        return `You are an AI assistant for an ioBroker dashboard CLI tool. You help users manage their smart home dashboard through natural language.

CURRENT DASHBOARD STATE:
- Connected to ioBroker: ${context.connected}
- Groups: ${context.groups.length}
- Total Elements: ${context.status.totalElements}
- Can access ioBroker metadata: ${context.hasIoBrokerAccess}

AVAILABLE GROUPS:
${context.groups.map(g => `- ${g.title} (${g.elementCount} elements)`).join('\n')}

AVAILABLE COMMANDS:
${context.availableCommands.map(c => `- ${c.usage} (aliases: ${c.aliases.join(', ')}): ${c.description}`).join('\n')}

ELEMENT TYPES:
- gauge: Shows numeric values with min/max (good for power, temperature)
- switch: Interactive on/off toggle
- button: Clickable action trigger  
- indicator: Status light (on/off, alive/dead)
- text: String value display
- number: Simple numeric display
- sparkline: Mini chart for trends

SPECIAL CAPABILITIES:
${context.hasIoBrokerAccess ? 
`- I can look up state metadata using getObject() to verify states exist
- I can determine the best element type based on state metadata (type, role)
- I can get units, min/max values, and write permissions from ioBroker
- When users mention state IDs, I should validate them when possible` :
`- ioBroker access not available - cannot validate state IDs`}

${context.hasMCPAccess ?
`MCP SERVER ACCESS:
- Connected to MCP server with enhanced ioBroker tools
- Available MCP tools: ${context.mcpTools?.map(t => t.name).join(', ') || 'none'}
- Available MCP resources: ${context.mcpResources?.length || 0} resources
- Can perform advanced ioBroker operations via MCP tools` :
`- MCP server not connected (enhanced features unavailable)`}

INSTRUCTIONS:
1. Understand the user's intent for dashboard management
2. If they mention specific state IDs, try to validate them if connected
3. Use state metadata to suggest the best element type automatically
4. If they want to execute commands, suggest specific commands
5. If they ask questions, provide helpful information about their dashboard
6. Be concise and practical
7. When suggesting commands, format them clearly
8. You can suggest multiple commands if needed
9. Use MCP tools directly when you need to search, get states, or perform ioBroker operations
10. For queries like "search for temperature sensors" or "what lights are available", use MCP tools first

CRITICAL: add-state command format is: add-state <group> <title> <stateId> [type]
Example: add-state "Temperatures" "Außentemperatur" modbus.2.holdingRegisters._Aussentemparatur gauge
NOT: add-state modbus.2.holdingRegisters._Aussentemparatur "Temperatures" gauge "Außentemperatur"

RESPONSE FORMAT:
Provide a natural language explanation, and if commands are needed, list them clearly like:
Commands to run:
- command1 arg1 arg2
- command2 arg1 arg2

User's dashboard context: ${context.groups.length} groups, ${context.status.totalElements} total elements, connected: ${context.connected}`;
    }

    parseAIResponse(response) {
        const lines = response.split('\n');
        const commands = [];
        let explanation = '';
        let inCommandSection = false;

        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.toLowerCase().includes('commands to run:') || 
                trimmed.toLowerCase().includes('suggested commands:')) {
                inCommandSection = true;
                continue;
            }
            
            if (inCommandSection && trimmed.startsWith('-')) {
                // Extract command from "- command arg1 arg2" format
                const command = trimmed.substring(1).trim();
                if (command) {
                    commands.push(command);
                }
            } else if (!inCommandSection) {
                explanation += line + '\n';
            }
        }

        return {
            commands,
            explanation: explanation.trim()
        };
    }

    async executeAIResponse(aiResult) {
        if (!aiResult.success) {
            this.dashboard.addErrorMessage(aiResult.error);
            return;
        }

        // Show AI explanation with a small delay for better flow
        if (aiResult.explanation) {
            // Split long explanations into multiple lines for better readability
            const lines = aiResult.explanation.split('\n').filter(line => line.trim());
            for (const line of lines) {
                if (line.trim()) {
                    this.dashboard.addInfoMessage(`🤖 ${line.trim()}`);
                    await this.sleep(100); // Small delay between lines
                }
            }
        }

        // Execute suggested commands with delays
        if (aiResult.commands && aiResult.commands.length > 0) {
            await this.sleep(200); // Pause before showing command execution
            this.dashboard.addInfoMessage(`🔧 Executing ${aiResult.commands.length} command(s):`);
            await this.sleep(300);
            
            for (const command of aiResult.commands) {
                this.dashboard.addInfoMessage(`> ${command}`);
                await this.sleep(200); // Small delay to show the command before executing
                
                // Parse and execute the command (handle quoted arguments)
                const args = this.parseCommandLine(command);
                const cmd = args[0].toLowerCase();
                const commandArgs = args.slice(1);
                
                // Execute through command registry
                const handled = await this.dashboard.commands.execute(cmd, commandArgs);
                
                if (!handled) {
                    this.dashboard.addErrorMessage(`Unknown command from AI: ${cmd}`);
                }
                
                await this.sleep(300); // Pause between commands
            }
        } else if (!aiResult.explanation) {
            this.dashboard.addInfoMessage(`🤖 ${aiResult.response}`);
        }
    }

    // Helper method for delays
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Parse command line with quoted arguments
    parseCommandLine(command) {
        const args = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < command.length; i++) {
            const char = command[i];
            
            if ((char === '"' || char === "'") && !inQuotes) {
                // Start of quoted string
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar && inQuotes) {
                // End of quoted string
                inQuotes = false;
                quoteChar = '';
            } else if (char === ' ' && !inQuotes) {
                // Space outside quotes - end current argument
                if (current.trim()) {
                    args.push(current.trim());
                    current = '';
                }
            } else {
                // Regular character
                current += char;
            }
        }
        
        // Add final argument if any
        if (current.trim()) {
            args.push(current.trim());
        }
        
        return args;
    }
}

export default AIService;