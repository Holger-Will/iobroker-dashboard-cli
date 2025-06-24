import { BaseCommand } from './base-command.js';

export class AddCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
        
        // Define available element types and their display names
        this.elementTypes = {
            'gauge': 'Gauge (shows numeric value with min/max)',
            'number': 'Number (simple numeric display)',
            'switch': 'Switch (on/off toggle)',
            'indicator': 'Indicator (status light)',
            'button': 'Button (clickable action)',
            'text': 'Text (string value display)',
            'sparkline': 'Sparkline (mini chart)'
        };
    }

    get name() {
        return 'add';
    }

    get aliases() {
        return ['a'];
    }

    get description() {
        return 'Add groups or elements to the dashboard';
    }

    get usage() {
        return '/add [-g <group>] [-n <name>] [-s <stateId>] [-i <index>] [-t <type>] [-c]';
    }

    get flagSchema() {
        return {
            knownFlags: ['g', 'n', 's', 'i', 't', 'h', 'c'],
            flags: {
                g: { type: 'string', description: 'Group name (for elements) or new group name (with -c)' },
                n: { type: 'string', description: 'Element name/caption' },
                s: { type: 'string', description: 'ioBroker state ID to monitor' },
                i: { type: 'number', description: 'Index position where to insert element' },
                t: { type: 'string', enum: Object.keys(this.elementTypes), description: 'Element type (auto-detected if omitted)' },
                h: { type: 'boolean', description: 'Show help' },
                c: { type: 'boolean', description: 'Create a new group instead of adding element' }
            }
        };
    }

    get examples() {
        return [
            '/add -c -g "Solar System"',
            '/add -g Solar -n "PV Power" -s javascript.0.solar.produktion',
            '/add -g Temperatures -n "Outdoor" -s modbus.2.temp -t gauge',
            '/add -g System -n "Pump" -s system.adapter.pump.0.enabled -t switch',
            '/add -g Controls -n "Restart" -s system.adapter.restart -t button -i 0'
        ];
    }

    async run(parsedArgs) {
        if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'connection') {
            this.error('Please complete connection setup first. Use "/test -c" or skip connection.');
            return;
        }

        // Check if creating a group
        if (parsedArgs.hasFlag('c')) {
            await this.createGroup(parsedArgs);
        } else {
            await this.createElement(parsedArgs);
        }
    }

    async createGroup(parsedArgs) {
        // Validate required flags for group creation
        if (!this.requireFlags(parsedArgs, ['g'])) {
            return;
        }

        const groupName = parsedArgs.getFlag('g').replace(/['"]/g, '');
        
        try {
            const result = await this.tools.addGroup(groupName);
            
            if (result.success) {
                this.success(`Created group: ${groupName}`);
                
                // Force a complete re-render to show the new group
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderer.elementPositions.clear();
                
                this.render();
            } else {
                this.error(`Failed to create group: ${result.error}`);
            }
        } catch (error) {
            this.error(`Error creating group: ${error.message}`);
        }
    }

    async createElement(parsedArgs) {
        // Validate required flags for element creation
        if (!this.requireFlags(parsedArgs, ['g', 'n', 's'])) {
            this.showElementUsage();
            return;
        }

        const groupName = parsedArgs.getFlag('g');
        const elementName = parsedArgs.getFlag('n');
        const stateId = parsedArgs.getFlag('s');
        const requestedType = parsedArgs.getFlag('t', null);
        const insertIndex = parsedArgs.getFlag('i', undefined);

        // Validate element type if provided
        if (requestedType && !this.elementTypes[requestedType]) {
            this.error(`Invalid element type: ${requestedType}`);
            this.showAvailableTypes();
            return;
        }

        try {
            // Find the group
            const groups = this.tools.listGroups();
            const group = groups.find(g => 
                g.title.toLowerCase().includes(groupName.toLowerCase()) || 
                g.id === groupName
            );

            if (!group) {
                this.error(`Group not found: ${groupName}`);
                this.showAvailableGroups(groups);
                return;
            }

            // Get object metadata to infer element type
            let finalElementType = requestedType || 'number'; // Default fallback
            let objData = null;
            
            try {
                if (this.dashboard.client && this.dashboard.client.isConnected()) {
                    objData = await this.dashboard.client.getObject(stateId);
                    if (objData && objData.common) {
                        const inferredType = this.inferElementType(objData.common, finalElementType);
                        if (!requestedType) {
                            // No type specified - use inferred type
                            this.info(`↳ Auto-detected element type: ${inferredType} (from ${objData.common.type}/${objData.common.role})`);
                            finalElementType = inferredType;
                        } else if (inferredType !== finalElementType) {
                            // Type specified but different from inference
                            this.info(`↳ Using specified type: ${finalElementType} (inferred: ${inferredType})`);
                        }
                    } else if (!requestedType) {
                        this.warning(`Could not get object metadata for ${stateId} - using default type: ${finalElementType}`);
                    }
                } else {
                    if (!requestedType) {
                        this.warning(`Not connected to ioBroker - using default element type: ${finalElementType}`);
                    }
                }
            } catch (error) {
                if (!requestedType) {
                    this.warning(`Could not get object metadata for ${stateId}: ${error.message} - using default type: ${finalElementType}`);
                } else {
                    this.warning(`Could not get object metadata for ${stateId}: ${error.message}`);
                }
            }

            // Create element configuration
            const elementConfig = {
                id: `${finalElementType}_${Date.now()}`,
                type: finalElementType,
                caption: elementName.replace(/['"]/g, ''),
                stateId: stateId,
                interactive: true
            };

            // Add type-specific defaults using metadata if available
            this.addTypeSpecificConfig(elementConfig, objData ? objData.common : null);

            // Add the element with optional index
            const result = await this.tools.addElement(group.id, elementConfig, insertIndex);

            if (result.success) {
                const indexInfo = insertIndex !== undefined ? ` at position ${insertIndex}` : '';
                this.success(`Added ${finalElementType} "${elementName}" to group "${group.title}"${indexInfo}`);
                this.info(`↳ Monitoring: ${stateId}`);
                
                // Immediately connect the new element to get current state
                if (this.dashboard.client && this.dashboard.client.isConnected() && result.element) {
                    result.element.connect(this.dashboard.client);
                    
                    // Listen for value changes to trigger re-render
                    result.element.on('valueChanged', () => {
                        this.dashboard.debouncedRender();
                    });
                }
                
                // Force a complete re-render to show the new element
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderer.elementPositions.clear();
                
                this.render();
            } else {
                this.error(`Failed to add element: ${result.error}`);
            }

        } catch (error) {
            this.error(`Error adding element: ${error.message}`);
        }
    }

    inferElementType(common, requestedType) {
        if (!common) return requestedType;

        const type = common.type;
        const role = common.role;
        const write = common.write !== false; // Default to writable if not specified

        // Role-based inference (more specific)
        if (role) {
            if (role.includes('switch') || role.includes('button.')) {
                return write ? 'switch' : 'indicator';
            }
            if (role.includes('indicator') || role.includes('sensor.') || role === 'state') {
                return 'indicator';
            }
            if (role.includes('level.') || role.includes('value.power') || role.includes('value.')) {
                return type === 'number' ? 'gauge' : 'number';
            }
        }

        // Type-based inference (fallback)
        if (type === 'boolean') {
            return write ? 'switch' : 'indicator';
        }
        if (type === 'number') {
            // Check if it has min/max ranges for gauge
            if (common.min !== undefined && common.max !== undefined) {
                return 'gauge';
            }
            return 'number';
        }
        if (type === 'string') {
            return 'text';
        }

        // Default to requested type if we can't infer
        return requestedType;
    }

    addTypeSpecificConfig(config, common = null) {
        switch (config.type) {
            case 'gauge':
                // Use metadata if available
                if (common) {
                    config.unit = common.unit || '';
                    config.min = common.min !== undefined ? common.min : 0;
                    config.max = common.max !== undefined ? common.max : 100;
                } else {
                    config.unit = 'W'; // Default unit
                    config.min = 0;
                    config.max = 1000;
                }
                break;
            case 'number':
                config.unit = common ? (common.unit || '') : '';
                break;
            case 'switch':
                config.interactive = common ? (common.write !== false) : true;
                break;
            case 'indicator':
                // Indicators are typically read-only
                config.interactive = false;
                break;
            case 'button':
                config.interactive = common ? (common.write !== false) : true;
                break;
            case 'text':
                // Text elements show string values
                break;
            case 'sparkline':
                // Sparklines show historical data
                break;
        }
    }

    showElementUsage() {
        this.info('Element creation requires:');
        this.info('  -g <group>   - Target group name');
        this.info('  -n <name>    - Element name/caption');
        this.info('  -s <stateId> - ioBroker state ID to monitor');
        this.info('');
        this.info('Optional flags:');
        this.info('  -t <type>    - Element type (auto-detected if omitted)');
        this.info('  -i <index>   - Insert position in group');
        this.info('');
        this.showAvailableTypes();
    }

    showAvailableTypes() {
        this.info('Available element types:');
        Object.entries(this.elementTypes).forEach(([type, description]) => {
            this.info(`  ${type.padEnd(10)} - ${description}`);
        });
    }

    showAvailableGroups(groups) {
        if (groups.length === 0) {
            this.info('No groups available. Create one first with: /add -c -g <name>');
        } else {
            this.info('Available groups:');
            groups.forEach(group => {
                this.info(`  - ${group.title}`);
            });
        }
    }
}

export default AddCommand;