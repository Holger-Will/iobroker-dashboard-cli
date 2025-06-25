# AI Local Tool Integration Specification

**Date:** June 25, 2025
**Purpose:** Replace text-based command simulation with real function calls for local dashboard operations

## Current Problem Analysis

### How Local "Tools" Work Now (Text Simulation)
```javascript
// AI generates text commands
aiResult.commands = ["/add -g Solar -t gauge -c 'PV Power' -s javascript.0.solar.power"];

// AI service parses text and executes as string command
await this.dashboard.processSlashCommand(command);
```

### Issues with Current Approach
1. **Error-prone**: AI must generate perfect command syntax
2. **No validation**: Errors discovered during string parsing
3. **Limited feedback**: AI doesn't know if arguments are valid
4. **Brittle**: Command syntax changes break AI integration
5. **No structured data**: Everything goes through string parsing

## Desired Architecture

### Real Tool Calls (Like MCP)
```javascript
// AI calls structured functions
{
    "tool_use": {
        "name": "add_dashboard_element",
        "input": {
            "group": "Solar",
            "type": "gauge", 
            "caption": "PV Power",
            "stateId": "javascript.0.solar.power"
        }
    }
}

// Direct function execution (no string parsing)
const result = await localTools.addDashboardElement(input);
```

## Local Tool Definitions

### 1. Dashboard Management Tools

#### add_dashboard_element
```javascript
{
    name: "add_dashboard_element",
    description: "Add a new element to a dashboard group",
    input_schema: {
        type: "object",
        properties: {
            group: {
                type: "string",
                description: "Group name or ID to add element to"
            },
            type: {
                type: "string", 
                enum: ["gauge", "switch", "button", "indicator", "text", "number"],
                description: "Type of dashboard element"
            },
            caption: {
                type: "string",
                description: "Display name for the element"
            },
            stateId: {
                type: "string",
                description: "ioBroker state ID to connect to element"
            },
            unit: {
                type: "string",
                description: "Unit of measurement (optional)"
            },
            min: {
                type: "number",
                description: "Minimum value for gauge elements (optional)"
            },
            max: {
                type: "number", 
                description: "Maximum value for gauge elements (optional)"
            }
        },
        required: ["group", "type", "caption", "stateId"]
    }
}
```

#### create_dashboard_group
```javascript
{
    name: "create_dashboard_group",
    description: "Create a new dashboard group",
    input_schema: {
        type: "object",
        properties: {
            title: {
                type: "string",
                description: "Name/title of the new group"
            },
            position: {
                type: "number",
                description: "Position in group list (optional, defaults to end)"
            }
        },
        required: ["title"]
    }
}
```

#### save_dashboard
```javascript
{
    name: "save_dashboard",
    description: "Save current dashboard configuration",
    input_schema: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "Filename to save as (optional, defaults to current)"
            },
            name: {
                type: "string", 
                description: "Display name for the dashboard (optional)"
            }
        },
        required: []
    }
}
```

#### load_dashboard
```javascript
{
    name: "load_dashboard", 
    description: "Load a saved dashboard configuration",
    input_schema: {
        type: "object",
        properties: {
            filename: {
                type: "string",
                description: "Filename of dashboard to load"
            }
        },
        required: ["filename"]
    }
}
```

### 2. Dashboard Query Tools

#### list_dashboard_configs
```javascript
{
    name: "list_dashboard_configs",
    description: "List all available dashboard configurations",
    input_schema: {
        type: "object",
        properties: {},
        required: []
    }
}
```

#### get_dashboard_status
```javascript
{
    name: "get_dashboard_status",
    description: "Get current dashboard status and statistics",
    input_schema: {
        type: "object", 
        properties: {},
        required: []
    }
}
```

#### list_groups
```javascript
{
    name: "list_groups",
    description: "List all groups in current dashboard",
    input_schema: {
        type: "object",
        properties: {},
        required: []
    }
}
```

### 3. Element Management Tools

#### remove_dashboard_element
```javascript
{
    name: "remove_dashboard_element",
    description: "Remove an element from dashboard",
    input_schema: {
        type: "object",
        properties: {
            group: {
                type: "string",
                description: "Group name or ID containing the element"
            },
            element: {
                type: "string", 
                description: "Element caption or ID to remove"
            }
        },
        required: ["group", "element"]
    }
}
```

#### move_group
```javascript
{
    name: "move_group",
    description: "Move a group up or down in the display order", 
    input_schema: {
        type: "object",
        properties: {
            group: {
                type: "string",
                description: "Group name or ID to move"
            },
            direction: {
                type: "string",
                enum: ["up", "down"],
                description: "Direction to move the group"
            }
        },
        required: ["group", "direction"]
    }
}
```

## Implementation Architecture

### 1. Local Tool Registry

**Create new file: `local-tools.js`**
```javascript
import { DashboardTools } from './dashboard-tools.js';

export class LocalToolRegistry {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.tools = new Map();
        this.registerTools();
    }

    registerTools() {
        // Register all local tools
        this.tools.set('add_dashboard_element', {
            schema: { /* schema definition */ },
            handler: this.addDashboardElement.bind(this)
        });
        
        this.tools.set('create_dashboard_group', {
            schema: { /* schema definition */ },
            handler: this.createDashboardGroup.bind(this)
        });
        
        // ... register all tools
    }

    getToolSchemas() {
        const schemas = [];
        for (const [name, tool] of this.tools) {
            schemas.push({
                name,
                description: tool.schema.description,
                input_schema: tool.schema.input_schema
            });
        }
        return schemas;
    }

    async callTool(toolName, input) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Unknown local tool: ${toolName}`);
        }

        try {
            // Validate input against schema
            this.validateInput(input, tool.schema.input_schema);
            
            // Execute tool handler
            const result = await tool.handler(input);
            
            return {
                success: true,
                result: result
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    validateInput(input, schema) {
        // Basic JSON schema validation
        // Could use ajv library for full validation
        for (const requiredField of schema.required || []) {
            if (!(requiredField in input)) {
                throw new Error(`Missing required field: ${requiredField}`);
            }
        }
    }

    // Tool handler implementations
    async addDashboardElement(input) {
        const { group, type, caption, stateId, unit, min, max } = input;
        
        // Find or create group
        let groupId;
        const existingGroups = this.dashboard.tools.listGroups();
        const existingGroup = existingGroups.find(g => 
            g.title === group || g.id === group
        );
        
        if (existingGroup) {
            groupId = existingGroup.id;
        } else {
            const newGroup = await this.dashboard.tools.addGroup(group);
            if (!newGroup.success) {
                throw new Error(`Failed to create group: ${newGroup.error}`);
            }
            groupId = newGroup.group.id;
        }

        // Add element to group
        const elementConfig = {
            type,
            caption, 
            stateId,
            unit,
            min,
            max
        };

        const result = await this.dashboard.tools.addElement(groupId, elementConfig);
        if (!result.success) {
            throw new Error(`Failed to add element: ${result.error}`);
        }

        return {
            message: `Added ${type} element "${caption}" to group "${group}"`,
            groupId,
            elementId: result.element.id
        };
    }

    async createDashboardGroup(input) {
        const { title, position } = input;
        
        const result = await this.dashboard.tools.addGroup(title);
        if (!result.success) {
            throw new Error(`Failed to create group: ${result.error}`);
        }

        // Handle positioning if specified
        if (position !== undefined) {
            // Move group to specified position
            // Implementation depends on move functionality
        }

        return {
            message: `Created group "${title}"`,
            groupId: result.group.id,
            groupTitle: result.group.title
        };
    }

    // ... implement other tool handlers
}
```

### 2. AI Service Integration

**Update `ai-service.js`:**
```javascript
import { LocalToolRegistry } from './local-tools.js';

class AIService {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.localTools = new LocalToolRegistry(dashboard);
        // ... existing code
    }

    async processNaturalLanguageQuery(query) {
        // ... existing setup code

        // Get both MCP and local tools
        let tools = [];
        
        // Add MCP tools
        if (mcpConnected) {
            const mcpTools = this.dashboard.mcp.getAvailableTools();
            tools.push(...mcpTools.map(tool => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema
            })));
        }

        // Add local tools
        const localTools = this.localTools.getToolSchemas();
        tools.push(...localTools);

        // Call Claude with all tools
        const response = await this.anthropic.messages.create({
            // ... existing config
            tools: tools.length > 0 ? tools : undefined,
        });

        // Handle tool calls
        if (response.content.some(content => content.type === 'tool_use')) {
            return await this.handleToolCalls(response, messages, tools);
        }

        // ... handle non-tool responses
    }

    async handleToolCalls(response, messages, allTools) {
        // Add assistant response to conversation
        messages.push({
            role: 'assistant',
            content: response.content
        });

        // Execute each tool call
        for (const content of response.content) {
            if (content.type === 'tool_use') {
                const { name, input, id } = content;
                let toolResult;

                try {
                    // Determine if tool is MCP or local
                    if (this.isLocalTool(name)) {
                        // Execute local tool
                        toolResult = await this.localTools.callTool(name, input);
                    } else {
                        // Execute MCP tool
                        toolResult = await this.dashboard.mcp.callTool(name, input);
                    }

                    // Add tool result to conversation
                    messages.push({
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: id,
                            content: JSON.stringify(toolResult)
                        }]
                    });

                } catch (error) {
                    messages.push({
                        role: 'user',
                        content: [{
                            type: 'tool_result',
                            tool_use_id: id,
                            is_error: true,
                            content: error.message
                        }]
                    });
                }
            }
        }

        // Get Claude's final response after tool execution
        const finalResponse = await this.anthropic.messages.create({
            model: this.getModelName(),
            max_tokens: 1000,
            system: this.buildSystemPrompt(this.getDashboardContext()),
            messages: messages,
            tools: allTools.length > 0 ? allTools : undefined,
        });

        return this.formatResponse(finalResponse);
    }

    isLocalTool(toolName) {
        return this.localTools.tools.has(toolName);
    }
}
```

### 3. Enhanced System Prompt

**Update system prompt to describe real tools:**
```javascript
buildSystemPrompt(context) {
    return `You are an AI assistant for an ioBroker dashboard CLI tool.

IMPORTANT: You have access to REAL FUNCTION CALLS for dashboard operations:

LOCAL DASHBOARD TOOLS:
- add_dashboard_element: Add elements to dashboard groups
- create_dashboard_group: Create new groups
- save_dashboard: Save current configuration
- load_dashboard: Load saved configurations
- list_dashboard_configs: List available dashboards
- get_dashboard_status: Get current status
- move_group: Reorder groups

MCP IOBROKER TOOLS:
- get_states: Query ioBroker state values
- search_states: Find states by pattern
- set_state: Change state values
- get_objects: Get object definitions

USAGE INSTRUCTIONS:
1. Use LOCAL tools for dashboard structure changes (add elements, create groups, save)
2. Use MCP tools for ioBroker data queries and state changes
3. ALWAYS use function calls instead of generating text commands
4. Validate state IDs with MCP tools before adding dashboard elements
5. Create groups automatically when adding elements to non-existent groups

NEVER generate text commands like "/add ..." - always use the actual function calls.`;
}
```

## Migration Strategy

### Phase 1: Core Tool Registry
1. Create `local-tools.js` with basic tool registration
2. Implement 3-4 core tools (add_element, create_group, save, load)
3. Add input validation

### Phase 2: AI Integration
1. Update AI service to register local tools
2. Modify tool call handling to route local vs MCP
3. Update system prompt

### Phase 3: Complete Tool Set
1. Implement remaining dashboard management tools
2. Add comprehensive error handling
3. Test all tool combinations

### Phase 4: Deprecate Text Commands
1. Remove text command generation from AI
2. Update AI prompts to favor function calls
3. Keep text command fallback for user input

## Benefits

### For AI
- **Structured input validation** - Know immediately if parameters are valid
- **Direct function calls** - No string parsing errors
- **Rich return data** - Get structured results instead of parsing text
- **Better error handling** - Specific error messages with context

### For Users  
- **More reliable AI** - Fewer syntax errors and command failures
- **Consistent behavior** - Same validation as manual commands
- **Better error messages** - AI can provide specific guidance on what went wrong

### For Development
- **Maintainable** - Changes to command syntax don't break AI
- **Testable** - Can unit test tool functions independently
- **Extensible** - Easy to add new tools without changing AI logic

This architecture provides true tool integration rather than text simulation, making the AI much more robust and reliable for dashboard management.