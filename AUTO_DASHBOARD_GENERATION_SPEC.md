# Auto-Generate Dashboard from ioBroker Enums Specification

**Date:** June 25, 2025
**Purpose:** Automatically generate dashboards based on ioBroker enum configuration (functions and rooms)

## Overview

ioBroker uses enums to categorize devices by function (lights, heating, etc.) and location (rooms). This feature will automatically create structured dashboards by reading these enums and generating appropriate dashboard layouts.

## ioBroker Enum Structure

### Enum Types
```javascript
// enum.functions - Device functions/types
enum.functions.light         // Lighting devices
enum.functions.heating       // Heating/HVAC devices  
enum.functions.security      // Security devices
enum.functions.blinds        // Window blinds/shutters
enum.functions.multimedia    // Audio/Video devices
enum.functions.weather       // Weather sensors
// ... custom functions

// enum.rooms - Physical locations  
enum.rooms.living_room       // Living room devices
enum.rooms.kitchen          // Kitchen devices
enum.rooms.bedroom          // Bedroom devices
enum.rooms.bathroom         // Bathroom devices
// ... custom rooms
```

### Enum Object Structure
```javascript
// Example enum.functions.light object
{
    "_id": "enum.functions.light",
    "common": {
        "name": "Light",
        "members": [
            "zigbee.0.living_room.light_1.state",
            "zigbee.0.kitchen.ceiling_light.state", 
            "zigbee.0.bedroom.bedside_lamp.state"
        ]
    }
}

// Example enum.rooms.living_room object
{
    "_id": "enum.rooms.living_room", 
    "common": {
        "name": "Living Room",
        "members": [
            "zigbee.0.living_room.light_1.state",
            "zigbee.0.living_room.temperature.value",
            "zigbee.0.living_room.motion_sensor.state"
        ]
    }
}
```

## Auto-Generation Patterns

### 1. Function-Based Dashboard Generation

#### Lighting Dashboard Pattern
**Command:** `/generate-dashboard -f light` or `/generate-dashboard --function lighting`

**Logic:**
1. Query `enum.functions.light` (and variants like `enum.functions.lighting`)
2. Get all member state IDs
3. Group by room (cross-reference with `enum.rooms.*`)
4. Create dashboard with room-based groups
5. Add appropriate elements based on state roles

**Generated Structure:**
```
Lighting Dashboard
├── Living Room
│   ├── Ceiling Light (switch)
│   ├── Floor Lamp (switch/dimmer)
│   └── LED Strip (switch/dimmer/color)
├── Kitchen  
│   ├── Ceiling Lights (switch)
│   └── Under Cabinet (switch)
├── Bedroom
│   ├── Main Light (switch)
│   └── Bedside Lamps (switch/dimmer)
└── Bathroom
    ├── Main Light (switch)
    └── Mirror Light (switch)
```

#### Other Function Patterns
- **Heating Dashboard** (`enum.functions.heating`)
  - Groups by room
  - Temperature sensors (gauge)
  - Thermostats (number input)
  - Valve positions (gauge/indicator)

- **Security Dashboard** (`enum.functions.security`)
  - Motion sensors (indicator)
  - Door/window contacts (indicator)  
  - Cameras (button/status)
  - Alarm system (switch/indicator)

### 2. Room-Based Dashboard Generation

#### All Devices in Room Pattern
**Command:** `/generate-dashboard -r living_room` or `/generate-dashboard --room "Living Room"`

**Logic:**
1. Query `enum.rooms.living_room` 
2. Get all member state IDs
3. Group by function type
4. Create dashboard with function-based groups

**Generated Structure:**
```
Living Room Dashboard
├── Lighting
│   ├── Ceiling Light (switch)
│   └── Floor Lamp (dimmer)
├── Climate
│   ├── Temperature (gauge)
│   └── Humidity (gauge)  
├── Security
│   └── Motion Sensor (indicator)
└── Multimedia
    ├── TV Power (switch)
    └── Volume (gauge)
```

### 3. Complete Home Dashboard

#### Overview Dashboard Pattern
**Command:** `/generate-dashboard -a` or `/generate-dashboard --all`

**Logic:**
1. Query all `enum.rooms.*`
2. For each room, create summary group
3. Include most important states per room
4. Prioritize lighting, climate, security

## State Role Detection and Element Type Mapping

### Role-Based Element Type Detection
```javascript
// State role → Dashboard element type mapping
const ROLE_ELEMENT_MAPPING = {
    // Lighting
    'switch.light': 'switch',
    'level.dimmer': 'gauge',     // 0-100 dimmer
    'level.color.rgb': 'text',   // Color picker (future)
    
    // Climate  
    'value.temperature': 'gauge',
    'value.humidity': 'gauge', 
    'level.temperature': 'number', // Thermostat setpoint
    
    // Switches/Controls
    'switch': 'switch',
    'button': 'button',
    
    // Sensors
    'sensor.motion': 'indicator',
    'sensor.door': 'indicator', 
    'sensor.window': 'indicator',
    'sensor': 'indicator',       // Generic sensor
    
    // Values/Measurements
    'value': 'gauge',            // Generic numeric value
    'value.power': 'gauge',      // Power consumption
    'value.voltage': 'gauge',    // Voltage
    'value.current': 'gauge',    // Current
    
    // Media
    'switch.power': 'switch',    // Device power
    'level.volume': 'gauge',     // Volume control
};
```

### Object Common Properties Analysis
```javascript
// Use object.common properties for element configuration
function analyzeStateForDashboard(stateId, objectData) {
    const common = objectData.common || {};
    
    return {
        elementType: mapRoleToElementType(common.role),
        caption: common.name || stateId.split('.').pop(),
        unit: common.unit || '',
        min: common.min,
        max: common.max,
        writable: common.write !== false,
        interactive: common.write !== false && hasControlRole(common.role)
    };
}
```

### Device Name Resolution
```javascript
// Smart caption generation using device names instead of generic state names
// Examples of how device name resolution improves element names:

// Before (generic state names):
// hue.0.kueche.on → "On" or "Kueche"  ❌ Not descriptive
// hue.0.wohnzimmer_1.level → "Level"  ❌ Which device?

// After (device name resolution):
// hue.0.kueche.on → getObject("hue.0.kueche").common.name → "Kitchen Light"     ✅
// hue.0.wohnzimmer_1.level → getObject("hue.0.wohnzimmer_1").common.name → "Living Room Lamp Level"  ✅

// State suffix mapping for clarity:
const examples = {
    'hue.0.kitchen.on': 'Kitchen Light',           // No suffix for basic switch
    'hue.0.kitchen.level': 'Kitchen Light Level',  // Level for dimmers
    'zigbee.0.sensor_1.temperature': 'Bathroom Sensor Temperature',
    'shelly.0.switch_2.power': 'Desk Lamp Power'
};
```

## Implementation Architecture

### 1. Dashboard Generator Service

**Create new file: `dashboard-generator.js`**
```javascript
export class DashboardGenerator {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.ioBrokerClient = dashboard.client;
        this.dashboardTools = dashboard.tools;
    }

    async generateFunctionDashboard(functionName, options = {}) {
        // 1. Find enum.functions.* matching functionName
        const enumPattern = `enum.functions.${functionName}*`;
        const functionEnums = await this.findMatchingEnums(enumPattern);
        
        if (functionEnums.length === 0) {
            throw new Error(`No function enum found for: ${functionName}`);
        }

        // 2. Collect all member states
        const allMembers = new Set();
        for (const enumObj of functionEnums) {
            const members = enumObj.common?.members || [];
            members.forEach(member => allMembers.add(member));
        }

        // 3. Group states by room
        const roomGroups = await this.groupStatesByRoom(Array.from(allMembers));

        // 4. Generate dashboard structure
        const dashboardName = `${this.capitalize(functionName)} Dashboard`;
        return await this.createDashboardFromGroups(dashboardName, roomGroups);
    }

    async generateRoomDashboard(roomName, options = {}) {
        // 1. Find enum.rooms.* matching roomName
        const enumPattern = `enum.rooms.${roomName}*`;
        const roomEnums = await this.findMatchingEnums(enumPattern);
        
        if (roomEnums.length === 0) {
            throw new Error(`No room enum found for: ${roomName}`);
        }

        // 2. Collect all member states
        const allMembers = new Set();
        for (const enumObj of roomEnums) {
            const members = enumObj.common?.members || [];
            members.forEach(member => allMembers.add(member));
        }

        // 3. Group states by function
        const functionGroups = await this.groupStatesByFunction(Array.from(allMembers));

        // 4. Generate dashboard structure  
        const dashboardName = `${this.capitalize(roomName)} Dashboard`;
        return await this.createDashboardFromGroups(dashboardName, functionGroups);
    }

    async generateOverviewDashboard(options = {}) {
        // 1. Get all rooms
        const roomEnums = await this.findMatchingEnums('enum.rooms.*');
        
        const roomGroups = new Map();
        
        // 2. For each room, collect priority states
        for (const roomEnum of roomEnums) {
            const roomName = this.extractRoomName(roomEnum._id);
            const members = roomEnum.common?.members || [];
            
            // Get priority states (lights, temperature, security)
            const priorityStates = await this.filterPriorityStates(members);
            
            if (priorityStates.length > 0) {
                roomGroups.set(roomName, priorityStates);
            }
        }

        // 3. Generate overview dashboard
        return await this.createDashboardFromGroups('Home Overview', roomGroups);
    }

    async findMatchingEnums(pattern) {
        // Convert pattern to regex (enum.functions.light* → /enum\.functions\.light.*/i)
        const regexPattern = pattern.replace(/\*/g, '.*').replace(/\./g, '\\.');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        
        // Get all enum objects
        const enumObjects = await this.ioBrokerClient.getObjects('enum.*');
        
        return Object.values(enumObjects).filter(obj => 
            obj && obj._id && regex.test(obj._id)
        );
    }

    async groupStatesByRoom(stateIds) {
        const roomGroups = new Map();
        
        // Get all room enums
        const roomEnums = await this.findMatchingEnums('enum.rooms.*');
        
        // Create lookup map: stateId → room name
        const stateToRoom = new Map();
        for (const roomEnum of roomEnums) {
            const roomName = this.extractRoomName(roomEnum._id);
            const members = roomEnum.common?.members || [];
            
            for (const stateId of members) {
                if (stateIds.includes(stateId)) {
                    stateToRoom.set(stateId, roomName);
                }
            }
        }

        // Group states by room
        for (const stateId of stateIds) {
            const roomName = stateToRoom.get(stateId) || 'Other';
            
            if (!roomGroups.has(roomName)) {
                roomGroups.set(roomName, []);
            }
            roomGroups.get(roomName).push(stateId);
        }

        return roomGroups;
    }

    async groupStatesByFunction(stateIds) {
        // Similar to groupStatesByRoom but using enum.functions.*
        // Implementation follows same pattern
    }

    async createDashboardFromGroups(dashboardName, groupMap) {
        // Clear current dashboard
        this.dashboardTools.clearDashboard();
        
        const createdGroups = [];
        
        // Create groups and add elements
        for (const [groupName, stateIds] of groupMap) {
            // Create group
            const groupResult = await this.dashboardTools.addGroup(groupName);
            if (!groupResult.success) continue;
            
            const groupId = groupResult.group.id;
            createdGroups.push({ groupId, groupName, elementCount: 0 });
            
            // Add elements for each state
            for (const stateId of stateIds) {
                try {
                    const elementConfig = await this.createElementFromState(stateId);
                    const elementResult = await this.dashboardTools.addElement(groupId, elementConfig);
                    
                    if (elementResult.success) {
                        createdGroups[createdGroups.length - 1].elementCount++;
                    }
                } catch (error) {
                    console.warn(`Failed to add element for ${stateId}: ${error.message}`);
                }
            }
        }

        return {
            success: true,
            dashboardName,
            groups: createdGroups,
            totalElements: createdGroups.reduce((sum, g) => sum + g.elementCount, 0)
        };
    }

    async createElementFromState(stateId) {
        // Get object metadata
        const objectData = await this.ioBrokerClient.getObject(stateId);
        const common = objectData?.common || {};
        
        // Determine element type from role
        const elementType = this.mapRoleToElementType(common.role);
        
        // Generate caption from device name (preferred) or state ID fallback
        const caption = common.name || await this.generateCaptionFromStateId(stateId);
        
        return {
            type: elementType,
            caption: caption,
            stateId: stateId,
            unit: common.unit || '',
            min: common.min,
            max: common.max,
            interactive: common.write !== false && this.isInteractiveRole(common.role)
        };
    }

    mapRoleToElementType(role) {
        const ROLE_MAPPING = {
            'switch.light': 'switch',
            'switch': 'switch', 
            'level.dimmer': 'gauge',
            'level.temperature': 'number',
            'value.temperature': 'gauge',
            'value.humidity': 'gauge',
            'value.power': 'gauge',
            'value': 'gauge',
            'sensor.motion': 'indicator',
            'sensor.door': 'indicator',
            'sensor.window': 'indicator', 
            'sensor': 'indicator',
            'button': 'button'
        };

        return ROLE_MAPPING[role] || 'text';
    }

    isInteractiveRole(role) {
        const INTERACTIVE_ROLES = [
            'switch', 'switch.light', 'button', 'level.dimmer', 'level.temperature'
        ];
        return INTERACTIVE_ROLES.includes(role);
    }

    async generateCaptionFromStateId(stateId) {
        // Get device name from parent device/channel object
        // hue.0.kueche.on → get hue.0.kueche object and use its common.name
        const parts = stateId.split('.');
        const stateName = parts[parts.length - 1]; // 'on', 'level', etc.
        
        // Try to get parent device/channel object
        const deviceId = parts.slice(0, -1).join('.'); // hue.0.kueche
        
        try {
            const deviceObject = await this.ioBrokerClient.getObject(deviceId);
            if (deviceObject && deviceObject.common && deviceObject.common.name) {
                const deviceName = deviceObject.common.name; // "Küche" or "Kitchen Light"
                
                // Append state type suffix for clarity
                const stateTypeSuffix = this.getStateTypeSuffix(stateName);
                return `${deviceName}${stateTypeSuffix}`;
            }
        } catch (error) {
            console.warn(`Could not get device object for ${deviceId}: ${error.message}`);
        }
        
        // Fallback to cleaning up the state ID parts
        let caption = parts[parts.length - 2] || parts[parts.length - 1];
        caption = caption.replace(/_/g, ' ');
        caption = caption.replace(/\b\w/g, l => l.toUpperCase());
        
        return caption;
    }
    
    getStateTypeSuffix(stateName) {
        // Map common state names to descriptive suffixes
        const STATE_SUFFIXES = {
            'on': '',           // "Kitchen Light" (no suffix for basic switch)
            'state': '',        // "Kitchen Light" 
            'switch': '',       // "Kitchen Light"
            'level': ' Level',  // "Kitchen Light Level"
            'dimmer': ' Dimmer', // "Kitchen Light Dimmer"
            'brightness': ' Brightness', 
            'temperature': ' Temperature',
            'humidity': ' Humidity',
            'power': ' Power',
            'energy': ' Energy',
            'voltage': ' Voltage',
            'current': ' Current',
            'position': ' Position',
            'tilt': ' Tilt'
        };
        
        return STATE_SUFFIXES[stateName.toLowerCase()] || ` ${stateName}`;
    }

    extractRoomName(enumId) {
        // enum.rooms.living_room → "Living Room"
        const roomId = enumId.replace('enum.rooms.', '');
        return roomId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}
```

### 2. Command Interface

**Create new command: `generate-command.js`**
```javascript
import { BaseCommand } from './base-command.js';
import { DashboardGenerator } from '../dashboard-generator.js';

export class GenerateCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
        this.generator = new DashboardGenerator(dashboard);
    }

    get name() {
        return 'generate';
    }

    get aliases() {
        return ['gen', 'auto'];
    }

    get description() {
        return 'Auto-generate dashboard from ioBroker enums';
    }

    get usage() {
        return '/generate [-f <function>] [-r <room>] [-a] [-s <filename>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['f', 'r', 'a', 's', 'h'],
            flags: {
                f: { type: 'string', description: 'Generate by function (light, heating, etc.)' },
                r: { type: 'string', description: 'Generate by room name' },
                a: { type: 'boolean', description: 'Generate overview dashboard with all rooms' },
                s: { type: 'string', description: 'Save as filename after generation' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/generate -f light',
            '/generate -f heating', 
            '/generate -r living_room',
            '/generate -a',
            '/generate -f light -s lighting-dashboard.json'
        ];
    }

    async run(parsedArgs) {
        if (parsedArgs.hasFlag('h')) {
            this.showHelp();
            return;
        }

        try {
            let result;

            if (parsedArgs.hasFlag('f')) {
                // Generate by function
                const functionName = parsedArgs.getFlag('f');
                this.info(`Generating dashboard for function: ${functionName}`);
                result = await this.generator.generateFunctionDashboard(functionName);
                
            } else if (parsedArgs.hasFlag('r')) {
                // Generate by room
                const roomName = parsedArgs.getFlag('r');
                this.info(`Generating dashboard for room: ${roomName}`);
                result = await this.generator.generateRoomDashboard(roomName);
                
            } else if (parsedArgs.hasFlag('a')) {
                // Generate overview
                this.info('Generating overview dashboard...');
                result = await this.generator.generateOverviewDashboard();
                
            } else {
                this.error('Please specify generation type: -f <function>, -r <room>, or -a');
                this.showUsage();
                return;
            }

            if (result.success) {
                this.success(`Generated "${result.dashboardName}"`);
                this.info(`Created ${result.groups.length} groups with ${result.totalElements} elements`);
                
                // Show summary
                result.groups.forEach(group => {
                    this.info(`  - ${group.groupName}: ${group.elementCount} elements`);
                });

                // Auto-save if requested
                if (parsedArgs.hasFlag('s')) {
                    const filename = parsedArgs.getFlag('s');
                    const saveResult = await this.dashboard.tools.saveLayout(filename);
                    if (saveResult.success) {
                        this.success(`Saved as: ${filename}`);
                    } else {
                        this.warning(`Generation successful but save failed: ${saveResult.error}`);
                    }
                }

                // Refresh display
                this.dashboard.renderDashboard();
                
            } else {
                this.error(`Generation failed: ${result.error}`);
            }

        } catch (error) {
            this.error(`Generation error: ${error.message}`);
        }
    }

    showHelp() {
        this.info('Auto-generate dashboards from ioBroker enums:');
        this.info('');
        this.info('Generation types:');
        this.info('  -f <function>  Generate by device function (light, heating, security, etc.)');
        this.info('  -r <room>      Generate by room (living_room, kitchen, etc.)');
        this.info('  -a             Generate overview with all rooms');
        this.info('');
        this.info('Options:');
        this.info('  -s <filename>  Save generated dashboard');
        this.info('');
        this.info('Examples:');
        this.examples.forEach(example => {
            this.info(`  ${example}`);
        });
        this.info('');
        this.info('Note: Requires properly configured ioBroker enums');
    }
}
```

### 3. AI Tool Integration

**Add to LocalToolRegistry:**
```javascript
// In local-tools.js
this.tools.set('generate_dashboard', {
    schema: {
        description: "Auto-generate dashboard from ioBroker enums",
        input_schema: {
            type: "object",
            properties: {
                type: {
                    type: "string",
                    enum: ["function", "room", "overview"],
                    description: "Type of dashboard to generate"
                },
                name: {
                    type: "string", 
                    description: "Function or room name (required for function/room types)"
                },
                save_as: {
                    type: "string",
                    description: "Filename to save dashboard as (optional)"
                }
            },
            required: ["type"]
        }
    },
    handler: this.generateDashboard.bind(this)
});

async generateDashboard(input) {
    const { type, name, save_as } = input;
    const generator = new DashboardGenerator(this.dashboard);
    
    let result;
    switch (type) {
        case 'function':
            if (!name) throw new Error('Function name required');
            result = await generator.generateFunctionDashboard(name);
            break;
        case 'room':
            if (!name) throw new Error('Room name required');
            result = await generator.generateRoomDashboard(name);
            break;
        case 'overview':
            result = await generator.generateOverviewDashboard();
            break;
        default:
            throw new Error('Invalid generation type');
    }

    if (save_as && result.success) {
        await this.dashboard.tools.saveLayout(save_as);
    }

    return result;
}
```

## Benefits

### For Users
- **Instant dashboards** - Generate complete dashboards in seconds
- **Proper organization** - Room and function-based logical grouping
- **Comprehensive coverage** - Include all configured devices automatically
- **Smart element types** - Automatic element type detection from roles

### For Setup
- **Reduces manual work** - No need to manually add dozens of elements  
- **Consistent layouts** - Standardized dashboard structures
- **Quick iterations** - Easy to regenerate when adding new devices
- **Best practices** - Follows ioBroker enum conventions

### For Integration
- **Uses existing enums** - Leverages user's existing ioBroker configuration
- **Respects device roles** - Proper element types based on device capabilities
- **Room-aware** - Understands physical layout of smart home

This feature transforms dashboard creation from manual element-by-element building to automatic generation based on smart home structure!