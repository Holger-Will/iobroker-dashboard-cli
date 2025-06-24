import { BaseCommand } from './base-command.js';

export class AddStateCommand extends BaseCommand {
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
        return 'add-state';
    }

    get aliases() {
        return ['as', 'add'];
    }

    get description() {
        return 'Add a new element to display an ioBroker state';
    }

    get usage() {
        return 'add-state <group> <title> <stateId> [type] [options]';
    }

    get examples() {
        return [
            'add-state Solar "PV Power" javascript.0.solar.produktion',
            'as Temp "Outdoor" modbus.2.holdingRegisters._Aussentemparatur gauge',
            'add-state System "Pump" system.adapter.pump.0.enabled switch',
            'as Network "Router" ping.0.router.alive',
            'add-state Controls "Restart" system.adapter.restart button',
            'as Sensors "Status" javascript.0.status.message text'
        ];
    }

    async run(args) {
        if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'connection') {
            this.error('Please complete connection setup first. Use "test-connection" or "skip-connection".');
            return;
        }

        const parsed = this.parseArgs(args);
        
        if (parsed.params.length < 3) {
            this.showUsageHelp();
            return;
        }

        const [groupName, title, stateId, elementType] = parsed.params;
        
        // Element type is optional - if not provided, we'll infer it from metadata
        let requestedType = elementType ? elementType.toLowerCase() : null;
        
        // Validate element type if provided
        if (requestedType && !this.elementTypes[requestedType]) {
            this.error(`Invalid element type: ${elementType}`);
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
                caption: title.replace(/['"]/g, ''),
                stateId: stateId,
                interactive: true
            };

            // Add type-specific defaults using metadata if available
            this.addTypeSpecificConfig(elementConfig, objData ? objData.common : null);

            // Add the element
            const result = await this.tools.addElement(group.id, elementConfig);

            if (result.success) {
                this.success(`Added ${finalElementType} "${title}" to group "${group.title}"`);
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

    showUsageHelp() {
        this.error('Usage: add-state <group> <title> <stateId> [type]');
        this.info('');
        this.info('Parameters:');
        this.info('  group    - Name of existing group (or part of name)');
        this.info('  title    - Display name for the element');
        this.info('  stateId  - ioBroker state ID to monitor');
        this.info('  type     - Element type (optional - auto-detected if omitted)');
        this.info('');
        this.showAvailableTypes();
        this.info('');
        this.info('Examples:');
        this.examples.forEach(example => {
            this.info(`  ${example}`);
        });
    }

    showAvailableTypes() {
        this.info('Available element types:');
        Object.entries(this.elementTypes).forEach(([type, description]) => {
            this.info(`  ${type.padEnd(10)} - ${description}`);
        });
    }

    showAvailableGroups(groups) {
        if (groups.length === 0) {
            this.info('No groups available. Create one first with: add-group <name>');
        } else {
            this.info('Available groups:');
            groups.forEach(group => {
                this.info(`  - ${group.title}`);
            });
        }
    }
}

export default AddStateCommand;