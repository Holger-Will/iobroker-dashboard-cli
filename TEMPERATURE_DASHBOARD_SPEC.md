# Temperature Dashboard Auto-Generation Specification

**Date:** June 25, 2025
**Purpose:** Auto-generate temperature/climate dashboards using ioBroker enums with proper role filtering

## Temperature Dashboard Overview

### Target Enum Functions
- `enum.functions.heating` - Heating/HVAC devices
- `enum.functions.climate` - Climate control devices  
- `enum.functions.temperature` - Temperature sensors (if exists)
- `enum.functions.weather` - Weather sensors (indoor/outdoor)

### Dashboard Generation Command
```bash
/generate -f heating     # Generate heating/climate dashboard
/generate -f temperature # Generate temperature sensors dashboard  
/generate -f weather     # Generate weather dashboard
/generate -f climate     # Generate complete climate dashboard
```

## Temperature-Related Role Filtering

### Temperature Sensor Roles
**Valid temperature sensor states:**
- `role=value.temperature` + `type=number` ✅ Include
- `role=sensor.temperature` + `type=number` ✅ Include  
- `role=value` + `type=number` + `unit=°C|°F` ✅ Include
- `role=value.temperature` + `type=string` ❌ Exclude (text status)

```javascript
function isValidTemperatureSensor(objectData) {
    const common = objectData.common || {};
    const role = common.role;
    const type = common.type;
    const unit = common.unit;
    
    // Primary temperature roles
    if (role === 'value.temperature' || role === 'sensor.temperature') {
        return type === 'number';
    }
    
    // Generic value with temperature unit
    if (role === 'value' && type === 'number') {
        return unit && (unit.includes('°C') || unit.includes('°F') || unit.includes('K'));
    }
    
    return false;
}
```

### Humidity Sensor Roles  
**Valid humidity sensor states:**
- `role=value.humidity` + `type=number` ✅ Include
- `role=sensor.humidity` + `type=number` ✅ Include
- `role=value` + `type=number` + `unit=%|rH` ✅ Include

```javascript
function isValidHumiditySensor(objectData) {
    const common = objectData.common || {};
    const role = common.role;
    const type = common.type;
    const unit = common.unit;
    
    // Primary humidity roles
    if (role === 'value.humidity' || role === 'sensor.humidity') {
        return type === 'number';
    }
    
    // Generic value with humidity unit
    if (role === 'value' && type === 'number') {
        return unit && (unit.includes('%') || unit.includes('rH'));
    }
    
    return false;
}
```

### Thermostat Control Roles
**Valid thermostat/heating control states:**
- `role=level.temperature` + `type=number` ✅ Include (setpoint)
- `role=switch.heating` + `type=boolean` ✅ Include (heating on/off)
- `role=indicator.heating` + `type=boolean` ✅ Include (heating active)
- `role=value.valve` + `type=number` ✅ Include (valve position)

```javascript
function isValidThermostatControl(objectData) {
    const common = objectData.common || {};
    const role = common.role;
    const type = common.type;
    
    // Temperature setpoint
    if (role === 'level.temperature' && type === 'number') {
        return true;
    }
    
    // Heating switch
    if (role === 'switch.heating' && type === 'boolean') {
        return true;
    }
    
    // Heating indicator
    if (role === 'indicator.heating' && type === 'boolean') {
        return true;
    }
    
    // Valve position
    if (role === 'value.valve' && type === 'number') {
        return true;
    }
    
    return false;
}
```

## Enhanced Temperature State Filtering

### Multi-Sensor Device Handling
**Problem:** Many climate devices have multiple related sensors
```
zigbee.0.living_room.climate_sensor.temperature  (role=value.temperature)
zigbee.0.living_room.climate_sensor.humidity     (role=value.humidity)  
zigbee.0.living_room.climate_sensor.pressure     (role=value.pressure)
```

**Solution:** Group by device and include all relevant climate states

```javascript
function groupClimateStatesByDevice(stateIds) {
    const deviceGroups = new Map();
    
    for (const stateId of stateIds) {
        const deviceId = extractClimateDeviceId(stateId);
        
        if (!deviceGroups.has(deviceId)) {
            deviceGroups.set(deviceId, {
                temperature: null,
                humidity: null, 
                pressure: null,
                setpoint: null,
                valve: null,
                heating: null
            });
        }
        
        const sensorType = identifyClimateSensorType(stateId);
        if (sensorType) {
            deviceGroups.get(deviceId)[sensorType] = stateId;
        }
    }
    
    return deviceGroups;
}

function extractClimateDeviceId(stateId) {
    // zigbee.0.living_room.climate_sensor.temperature → zigbee.0.living_room.climate_sensor
    // homematic.0.living_room_thermostat.actual_temperature → homematic.0.living_room_thermostat
    const parts = stateId.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Known climate state names
    const climateStates = [
        'temperature', 'humidity', 'pressure', 'setpoint', 
        'actual_temperature', 'set_temperature', 'valve_position'
    ];
    
    if (climateStates.includes(lastPart.toLowerCase())) {
        return parts.slice(0, -1).join('.');
    }
    
    return stateId;
}

function identifyClimateSensorType(stateId) {
    const lastPart = stateId.split('.').pop().toLowerCase();
    
    if (lastPart.includes('temp')) return 'temperature';
    if (lastPart.includes('humid')) return 'humidity';
    if (lastPart.includes('pressure')) return 'pressure';
    if (lastPart.includes('setpoint') || lastPart.includes('set_temp')) return 'setpoint';
    if (lastPart.includes('valve')) return 'valve';
    if (lastPart.includes('heating')) return 'heating';
    
    return null;
}
```

## Updated Role-to-Element Mapping for Climate

### Climate-Specific Element Mapping
```javascript
const CLIMATE_ROLE_ELEMENT_MAPPING = {
    // Temperature sensors
    'value.temperature': { elementType: 'gauge', typeFilter: 'number' },
    'sensor.temperature': { elementType: 'gauge', typeFilter: 'number' },
    
    // Humidity sensors
    'value.humidity': { elementType: 'gauge', typeFilter: 'number' },
    'sensor.humidity': { elementType: 'gauge', typeFilter: 'number' },
    
    // Pressure sensors
    'value.pressure': { elementType: 'gauge', typeFilter: 'number' },
    'sensor.pressure': { elementType: 'gauge', typeFilter: 'number' },
    
    // Thermostat controls
    'level.temperature': { elementType: 'number', typeFilter: 'number' }, // Setpoint
    'switch.heating': { elementType: 'switch', typeFilter: 'boolean' },
    'indicator.heating': { elementType: 'indicator', typeFilter: 'boolean' },
    'value.valve': { elementType: 'gauge', typeFilter: 'number' },
    
    // Generic values with climate units
    'value': { 
        elementType: 'gauge', 
        typeFilter: 'number',
        unitFilter: ['°C', '°F', 'K', '%', 'rH', 'hPa', 'mbar'] 
    }
};
```

## Temperature Dashboard Generation Logic

### Enhanced State Selection for Climate
```javascript
// In dashboard-generator.js
export class DashboardGenerator {
    
    async generateClimateDashboard(functionName, options = {}) {
        // Find climate-related enums
        const climateEnums = await this.findClimateEnums(functionName);
        
        if (climateEnums.length === 0) {
            throw new Error(`No climate enum found for: ${functionName}`);
        }

        // Collect all member states
        const allMembers = new Set();
        for (const enumObj of climateEnums) {
            const members = enumObj.common?.members || [];
            members.forEach(member => allMembers.add(member));
        }

        // Filter and group climate states
        const validClimateStates = await this.filterValidClimateStates(Array.from(allMembers));
        const deviceGroups = this.groupClimateStatesByDevice(validClimateStates);
        const roomGroups = await this.groupClimateDevicesByRoom(deviceGroups);

        // Generate dashboard structure
        const dashboardName = `${this.capitalize(functionName)} Dashboard`;
        return await this.createClimateDashboardFromGroups(dashboardName, roomGroups);
    }
    
    async filterValidClimateStates(stateIds) {
        const validStates = [];
        
        for (const stateId of stateIds) {
            try {
                const objectData = await this.ioBrokerClient.getObject(stateId);
                
                if (this.isValidClimateState(objectData)) {
                    validStates.push({ stateId, objectData });
                }
            } catch (error) {
                console.warn(`Failed to analyze climate state ${stateId}: ${error.message}`);
            }
        }
        
        return validStates;
    }
    
    isValidClimateState(objectData) {
        const common = objectData.common || {};
        const role = common.role;
        const type = common.type;
        const unit = common.unit || '';
        
        // Temperature sensors
        if (role === 'value.temperature' || role === 'sensor.temperature') {
            return type === 'number';
        }
        
        // Humidity sensors
        if (role === 'value.humidity' || role === 'sensor.humidity') {
            return type === 'number';
        }
        
        // Pressure sensors
        if (role === 'value.pressure' || role === 'sensor.pressure') {
            return type === 'number';
        }
        
        // Thermostat controls
        if (role === 'level.temperature' && type === 'number') {
            return true; // Temperature setpoint
        }
        
        if (role === 'switch.heating' && type === 'boolean') {
            return true; // Heating switch
        }
        
        if (role === 'indicator.heating' && type === 'boolean') {
            return true; // Heating indicator
        }
        
        if (role === 'value.valve' && type === 'number') {
            return true; // Valve position
        }
        
        // Generic values with climate units
        if (role === 'value' && type === 'number') {
            const climateUnits = ['°C', '°F', 'K', '%', 'rH', 'hPa', 'mbar', 'Pa'];
            return climateUnits.some(u => unit.includes(u));
        }
        
        return false;
    }
    
    async createClimateDashboardFromGroups(dashboardName, roomGroups) {
        // Clear current dashboard
        this.dashboardTools.clearDashboard();
        
        const createdGroups = [];
        
        // Create room-based groups with climate elements
        for (const [roomName, devices] of roomGroups) {
            // Create room group
            const groupResult = await this.dashboardTools.addGroup(roomName);
            if (!groupResult.success) continue;
            
            const groupId = groupResult.group.id;
            let elementCount = 0;
            
            // Add elements for each device in room
            for (const [deviceName, states] of devices) {
                // Add temperature if available
                if (states.temperature) {
                    const tempElement = await this.createClimateElement(
                        states.temperature, 'temperature', deviceName
                    );
                    const result = await this.dashboardTools.addElement(groupId, tempElement);
                    if (result.success) elementCount++;
                }
                
                // Add humidity if available
                if (states.humidity) {
                    const humidityElement = await this.createClimateElement(
                        states.humidity, 'humidity', deviceName
                    );
                    const result = await this.dashboardTools.addElement(groupId, humidityElement);
                    if (result.success) elementCount++;
                }
                
                // Add thermostat setpoint if available
                if (states.setpoint) {
                    const setpointElement = await this.createClimateElement(
                        states.setpoint, 'setpoint', deviceName
                    );
                    const result = await this.dashboardTools.addElement(groupId, setpointElement);
                    if (result.success) elementCount++;
                }
                
                // Add heating control if available
                if (states.heating) {
                    const heatingElement = await this.createClimateElement(
                        states.heating, 'heating', deviceName
                    );
                    const result = await this.dashboardTools.addElement(groupId, heatingElement);
                    if (result.success) elementCount++;
                }
                
                // Add valve position if available
                if (states.valve) {
                    const valveElement = await this.createClimateElement(
                        states.valve, 'valve', deviceName
                    );
                    const result = await this.dashboardTools.addElement(groupId, valveElement);
                    if (result.success) elementCount++;
                }
            }
            
            createdGroups.push({ groupId, groupName: roomName, elementCount });
        }
        
        return {
            success: true,
            dashboardName,
            groups: createdGroups,
            totalElements: createdGroups.reduce((sum, g) => sum + g.elementCount, 0)
        };
    }
    
    async createClimateElement(stateData, climateType, deviceName) {
        const { stateId, objectData } = stateData;
        const common = objectData.common || {};
        
        // Generate appropriate caption
        let caption;
        if (common.name) {
            caption = common.name;
        } else {
            // Generate caption from device name and climate type
            const cleanDeviceName = deviceName.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            caption = `${cleanDeviceName} ${this.capitalize(climateType)}`;
        }
        
        // Determine element type
        let elementType;
        switch (climateType) {
            case 'temperature':
            case 'humidity': 
            case 'pressure':
            case 'valve':
                elementType = 'gauge';
                break;
            case 'setpoint':
                elementType = 'number';
                break;
            case 'heating':
                elementType = common.role === 'switch.heating' ? 'switch' : 'indicator';
                break;
            default:
                elementType = 'gauge';
        }
        
        const elementConfig = {
            type: elementType,
            caption: caption,
            stateId: stateId,
            unit: common.unit || '',
            interactive: common.write !== false && this.isInteractiveClimateRole(common.role)
        };
        
        // Add range for gauges and number inputs
        if (elementType === 'gauge' || elementType === 'number') {
            elementConfig.min = common.min;
            elementConfig.max = common.max;
        }
        
        return elementConfig;
    }
    
    isInteractiveClimateRole(role) {
        const INTERACTIVE_CLIMATE_ROLES = [
            'level.temperature', 'switch.heating'
        ];
        return INTERACTIVE_CLIMATE_ROLES.includes(role);
    }
    
    async findClimateEnums(functionName) {
        // Map function names to enum patterns
        const enumPatterns = {
            'heating': ['enum.functions.heating*', 'enum.functions.climate*'],
            'temperature': ['enum.functions.temperature*', 'enum.functions.climate*'],
            'climate': ['enum.functions.climate*', 'enum.functions.heating*'],
            'weather': ['enum.functions.weather*']
        };
        
        const patterns = enumPatterns[functionName] || [`enum.functions.${functionName}*`];
        
        let allEnums = [];
        for (const pattern of patterns) {
            const enums = await this.findMatchingEnums(pattern);
            allEnums.push(...enums);
        }
        
        // Remove duplicates
        const uniqueEnums = allEnums.filter((enum1, index) => 
            allEnums.findIndex(enum2 => enum2._id === enum1._id) === index
        );
        
        return uniqueEnums;
    }
}
```

## Expected Temperature Dashboard Structure

### Heating Dashboard Example
```
Heating Dashboard (from enum.functions.heating)
├── Living Room
│   ├── Thermostat Temperature (gauge)     ← current temp
│   ├── Thermostat Setpoint (number)       ← target temp  
│   ├── Heating Active (indicator)         ← heating status
│   └── Valve Position (gauge)             ← 0-100% valve
├── Kitchen  
│   ├── Temperature Sensor (gauge)         ← sensor reading
│   └── Humidity Sensor (gauge)            ← humidity reading
├── Bedroom
│   ├── Radiator Thermostat (gauge)        ← current temp
│   ├── Target Temperature (number)        ← setpoint
│   └── Heating On (switch)                ← manual control
```

### Weather Dashboard Example  
```
Weather Dashboard (from enum.functions.weather)
├── Outdoor
│   ├── Temperature (gauge)                ← outdoor temp
│   ├── Humidity (gauge)                   ← outdoor humidity
│   └── Pressure (gauge)                   ← barometric pressure
├── Indoor Overview
│   ├── Living Room Temp (gauge)           ← indoor sensors
│   ├── Kitchen Temp (gauge)
│   └── Bedroom Temp (gauge)
```

## Command Examples with Filtering

### Temperature Dashboard Generation
```bash
# Generate heating/climate dashboard
/generate -f heating

# Expected filtering results:
# ✅ zigbee.0.living_room.thermostat.temperature (role=value.temperature, type=number)
# ✅ zigbee.0.living_room.thermostat.setpoint (role=level.temperature, type=number)  
# ✅ zigbee.0.living_room.thermostat.heating (role=switch.heating, type=boolean)
# ❌ zigbee.0.living_room.thermostat.status (role=value.temperature, type=string) - excluded
# ❌ zigbee.0.living_room.motion.temperature (role=value, type=number, unit=count) - excluded (wrong unit)
```

This specification ensures temperature dashboards contain only relevant, properly-typed climate sensors and controls with intelligent device grouping!