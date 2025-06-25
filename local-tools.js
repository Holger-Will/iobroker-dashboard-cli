import { EventEmitter } from 'events';

export class LocalToolRegistry extends EventEmitter {
    constructor(dashboard) {
        super();
        this.dashboard = dashboard;
        this.tools = new Map();
        this.registerTools();
    }

    registerTools() {
        // Dashboard Management Tools
        this.tools.set('add_dashboard_element', {
            schema: {
                name: 'add_dashboard_element',
                description: 'Add a new element to a dashboard group',
                input_schema: {
                    type: 'object',
                    properties: {
                        group: {
                            type: 'string',
                            description: 'Group name or ID to add element to'
                        },
                        type: {
                            type: 'string',
                            enum: ['gauge', 'switch', 'button', 'indicator', 'text', 'number', 'slider'],
                            description: 'Type of dashboard element'
                        },
                        caption: {
                            type: 'string',
                            description: 'Display name for the element'
                        },
                        stateId: {
                            type: 'string',
                            description: 'ioBroker state ID to connect to element'
                        },
                        unit: {
                            type: 'string',
                            description: 'Unit of measurement (optional)'
                        },
                        min: {
                            type: 'number',
                            description: 'Minimum value for gauge/slider elements (optional)'
                        },
                        max: {
                            type: 'number',
                            description: 'Maximum value for gauge/slider elements (optional)'
                        }
                    },
                    required: ['group', 'type', 'caption', 'stateId']
                }
            },
            handler: this.addDashboardElement.bind(this)
        });

        this.tools.set('create_dashboard_group', {
            schema: {
                name: 'create_dashboard_group',
                description: 'Create a new dashboard group',
                input_schema: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'Name/title of the new group'
                        },
                        position: {
                            type: 'number',
                            description: 'Position in group list (optional, defaults to end)'
                        }
                    },
                    required: ['title']
                }
            },
            handler: this.createDashboardGroup.bind(this)
        });

        this.tools.set('save_dashboard', {
            schema: {
                name: 'save_dashboard',
                description: 'Save current dashboard configuration',
                input_schema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Filename to save as (optional, defaults to current)'
                        },
                        name: {
                            type: 'string',
                            description: 'Display name for the dashboard (optional)'
                        }
                    },
                    required: []
                }
            },
            handler: this.saveDashboard.bind(this)
        });

        this.tools.set('load_dashboard', {
            schema: {
                name: 'load_dashboard',
                description: 'Load a saved dashboard configuration',
                input_schema: {
                    type: 'object',
                    properties: {
                        filename: {
                            type: 'string',
                            description: 'Filename of dashboard to load'
                        }
                    },
                    required: ['filename']
                }
            },
            handler: this.loadDashboard.bind(this)
        });

        this.tools.set('list_dashboard_configs', {
            schema: {
                name: 'list_dashboard_configs',
                description: 'List all available dashboard configurations',
                input_schema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            handler: this.listDashboardConfigs.bind(this)
        });

        this.tools.set('get_dashboard_status', {
            schema: {
                name: 'get_dashboard_status',
                description: 'Get current dashboard status and statistics',
                input_schema: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            },
            handler: this.getDashboardStatus.bind(this)
        });

        this.tools.set('remove_dashboard_element', {
            schema: {
                name: 'remove_dashboard_element',
                description: 'Remove an element from dashboard',
                input_schema: {
                    type: 'object',
                    properties: {
                        group: {
                            type: 'string',
                            description: 'Group name or ID containing the element'
                        },
                        element: {
                            type: 'string',
                            description: 'Element caption or ID to remove'
                        }
                    },
                    required: ['group', 'element']
                }
            },
            handler: this.removeDashboardElement.bind(this)
        });

        this.tools.set('move_group', {
            schema: {
                name: 'move_group',
                description: 'Move a group up or down in the display order',
                input_schema: {
                    type: 'object',
                    properties: {
                        group: {
                            type: 'string',
                            description: 'Group name or ID to move'
                        },
                        direction: {
                            type: 'string',
                            enum: ['up', 'down'],
                            description: 'Direction to move the group'
                        }
                    },
                    required: ['group', 'direction']
                }
            },
            handler: this.moveGroup.bind(this)
        });
    }

    getToolSchemas() {
        const schemas = [];
        for (const [name, tool] of this.tools) {
            schemas.push(tool.schema);
        }
        return schemas;
    }

    async callTool(toolName, input) {
        const tool = this.tools.get(toolName);
        if (!tool) {
            return {
                success: false,
                error: `Unknown local tool: ${toolName}`
            };
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
        // Check required fields
        for (const requiredField of schema.required || []) {
            if (!(requiredField in input)) {
                throw new Error(`Missing required field: ${requiredField}`);
            }
        }

        // Check enum values
        for (const [fieldName, fieldSchema] of Object.entries(schema.properties || {})) {
            if (fieldName in input && fieldSchema.enum) {
                if (!fieldSchema.enum.includes(input[fieldName])) {
                    if (fieldName === 'type') {
                        throw new Error(`Invalid element type`);
                    }
                    throw new Error(`Invalid ${fieldName}. Valid values: ${fieldSchema.enum.join(', ')}`);
                }
            }
        }

        // Type validation for element types
        if (input.type && !['gauge', 'switch', 'button', 'indicator', 'text', 'number', 'slider'].includes(input.type)) {
            throw new Error(`Invalid element type`);
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
            unit: unit || '',
            min: min,
            max: max,
            interactive: ['switch', 'button', 'slider', 'number'].includes(type)
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
            // This would require additional implementation in dashboard tools
        }

        return {
            message: `Created group "${title}"`,
            groupId: result.group.id,
            groupTitle: result.group.title
        };
    }

    async saveDashboard(input) {
        const { filename, name } = input;
        
        const saveOptions = {};
        if (name) {
            saveOptions.name = name;
        }

        const result = await this.dashboard.tools.saveConfig(filename, saveOptions);
        if (!result.success) {
            throw new Error(`Failed to save dashboard: ${result.error}`);
        }

        return {
            message: `Saved dashboard as "${result.filename}"`,
            filename: result.filename
        };
    }

    async loadDashboard(input) {
        const { filename } = input;
        
        const result = await this.dashboard.tools.loadConfig(filename);
        if (!result.success) {
            throw new Error(`Failed to load dashboard: ${result.error}`);
        }

        return {
            message: `Loaded dashboard "${filename}"`,
            filename: filename,
            config: result.config
        };
    }

    async listDashboardConfigs(input) {
        const configs = await this.dashboard.configManager.list();
        
        return {
            message: `Found ${configs.length} dashboard configurations`,
            configs: configs
        };
    }

    async getDashboardStatus(input) {
        const status = this.dashboard.configManager.getCurrentStatus();
        const layout = this.dashboard.layout.getLayout();
        
        return {
            message: 'Current dashboard status',
            groupCount: status.groupCount,
            elementCount: status.elementCount,
            currentConfig: status.currentConfig,
            layout: {
                columns: layout.columns,
                totalHeight: layout.totalHeight,
                needsScrolling: layout.needsScrolling
            }
        };
    }

    async removeDashboardElement(input) {
        const { group, element } = input;
        
        // Find group
        const existingGroups = this.dashboard.tools.listGroups();
        const targetGroup = existingGroups.find(g => 
            g.title === group || g.id === group
        );
        
        if (!targetGroup) {
            throw new Error(`Group not found: ${group}`);
        }

        const result = await this.dashboard.tools.removeElement(targetGroup.id, element);
        if (!result.success) {
            throw new Error(`Failed to remove element: ${result.error}`);
        }

        return {
            message: `Removed element "${element}" from group "${group}"`,
            groupId: targetGroup.id,
            elementId: element
        };
    }

    async moveGroup(input) {
        const { group, direction } = input;
        
        // Find group
        const existingGroups = this.dashboard.tools.listGroups();
        const targetGroup = existingGroups.find(g => 
            g.title === group || g.id === group
        );
        
        if (!targetGroup) {
            throw new Error(`Group not found: ${group}`);
        }

        const result = await this.dashboard.tools.moveGroup(targetGroup.id, direction);
        if (!result.success) {
            throw new Error(`Failed to move group: ${result.error}`);
        }

        return {
            message: `Moved group "${group}" ${direction}`,
            groupId: targetGroup.id,
            direction: direction
        };
    }
}

export default LocalToolRegistry;