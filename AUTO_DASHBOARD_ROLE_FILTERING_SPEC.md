# Auto-Dashboard Role Filtering and Dimmer Handling Specification

**Date:** June 25, 2025
**Purpose:** Update auto-dashboard generation with proper role filtering and level.dimmer handling

## Role Filtering Requirements

### Switch Role Filtering
**Problem:** Not all `role=switch` or `role=switch.light` devices should be included
- Some have `type=boolean` (actual switches) ✅ Include
- Some have `type=string` (status/mode indicators) ❌ Exclude

**Solution:** Filter by both role AND type

```javascript
// Valid switch states for dashboard inclusion
function isValidSwitchState(objectData) {
    const common = objectData.common || {};
    const role = common.role;
    const type = common.type;
    
    // Only include boolean switches
    return (role === 'switch' || role === 'switch.light') && type === 'boolean';
}
```

### Level.Dimmer Role Handling
**Problem:** Multiple dimmer states per device with different ranges
- Some have `min=0, max=100` (percentage) ✅ Preferred  
- Some have `min=0, max=255` (raw value) ❌ Use only if no percentage version

**Solution:** Prioritize percentage dimmers (max=100)

```javascript
// Dimmer selection logic
function selectBestDimmer(dimmerStates) {
    // Group by device (same base ID)
    const deviceGroups = groupDimmersByDevice(dimmerStates);
    
    const selectedDimmers = [];
    
    for (const [deviceId, dimmers] of deviceGroups) {
        // Prefer max=100 (percentage) over max=255 (raw)
        const percentageDimmer = dimmers.find(d => d.common?.max === 100);
        const rawDimmer = dimmers.find(d => d.common?.max === 255);
        
        // Use percentage if available, otherwise raw
        const selectedDimmer = percentageDimmer || rawDimmer || dimmers[0];
        selectedDimmers.push(selectedDimmer);
    }
    
    return selectedDimmers;
}

function groupDimmersByDevice(dimmerStates) {
    const groups = new Map();
    
    for (const state of dimmerStates) {
        // Extract device ID (remove .level, .brightness, etc.)
        const deviceId = extractDeviceId(state.stateId);
        
        if (!groups.has(deviceId)) {
            groups.set(deviceId, []);
        }
        groups.get(deviceId).push(state);
    }
    
    return groups;
}

function extractDeviceId(stateId) {
    // zigbee.0.living_room.light_1.level → zigbee.0.living_room.light_1
    // hue.0.Philips_bulb.brightness → hue.0.Philips_bulb
    const parts = stateId.split('.');
    
    // Remove last part if it's a known dimmer state name
    const lastPart = parts[parts.length - 1];
    if (['level', 'brightness', 'dimmer', 'bri'].includes(lastPart)) {
        return parts.slice(0, -1).join('.');
    }
    
    return stateId;
}
```

## Updated Role-to-Element Mapping

### Enhanced Mapping with Type Filtering
```javascript
const ROLE_ELEMENT_MAPPING = {
    // Switches (only boolean type)
    'switch': { elementType: 'switch', typeFilter: 'boolean' },
    'switch.light': { elementType: 'switch', typeFilter: 'boolean' },
    
    // Dimmers (prefer max=100, fallback to max=255)
    'level.dimmer': { elementType: 'dimmer', preferredMax: 100, fallbackMax: 255 },
    
    // Temperature sensors
    'value.temperature': { elementType: 'gauge' },
    
    // Humidity sensors  
    'value.humidity': { elementType: 'gauge' },
    
    // Motion sensors
    'sensor.motion': { elementType: 'indicator', typeFilter: 'boolean' },
    
    // Door/window sensors
    'sensor.door': { elementType: 'indicator', typeFilter: 'boolean' },
    'sensor.window': { elementType: 'indicator', typeFilter: 'boolean' },
    
    // Generic sensors
    'sensor': { elementType: 'indicator' },
    
    // Power measurements
    'value.power': { elementType: 'gauge' },
    'value.voltage': { elementType: 'gauge' },
    'value.current': { elementType: 'gauge' },
    
    // Buttons
    'button': { elementType: 'button', typeFilter: 'boolean' },
    
    // Generic values
    'value': { elementType: 'gauge' }
};
```

## Updated DashboardGenerator Implementation

### Enhanced State Filtering
```javascript
// In dashboard-generator.js
export class DashboardGenerator {
    
    async filterValidStates(stateIds) {
        const validStates = [];
        const dimmerCandidates = [];
        
        for (const stateId of stateIds) {
            try {
                const objectData = await this.ioBrokerClient.getObject(stateId);
                const common = objectData?.common || {};
                
                // Check if state should be included
                if (this.isValidDashboardState(objectData)) {
                    if (common.role === 'level.dimmer') {
                        dimmerCandidates.push({ stateId, objectData });
                    } else {
                        validStates.push({ stateId, objectData });
                    }
                }
            } catch (error) {
                console.warn(`Failed to analyze state ${stateId}: ${error.message}`);
            }
        }
        
        // Process dimmer candidates to select best ones
        const selectedDimmers = this.selectBestDimmers(dimmerCandidates);
        validStates.push(...selectedDimmers);
        
        return validStates;
    }
    
    isValidDashboardState(objectData) {
        const common = objectData.common || {};
        const role = common.role;
        const type = common.type;
        
        // Switch role filtering - only boolean types
        if (role === 'switch' || role === 'switch.light') {
            return type === 'boolean';
        }
        
        // Motion sensor filtering - only boolean types
        if (role === 'sensor.motion' || role === 'sensor.door' || role === 'sensor.window') {
            return type === 'boolean';
        }
        
        // Button filtering - only boolean types
        if (role === 'button') {
            return type === 'boolean';
        }
        
        // Level dimmer - accept all, will be filtered later
        if (role === 'level.dimmer') {
            return true;
        }
        
        // Temperature, humidity, power values - accept all numeric
        if (role === 'value.temperature' || role === 'value.humidity' || 
            role === 'value.power' || role === 'value.voltage' || role === 'value.current') {
            return type === 'number';
        }
        
        // Generic sensor - prefer boolean but accept others
        if (role === 'sensor') {
            return true;
        }
        
        // Generic value - accept numeric
        if (role === 'value') {
            return type === 'number';
        }
        
        return false;
    }
    
    selectBestDimmers(dimmerCandidates) {
        // Group dimmers by device
        const deviceGroups = new Map();
        
        for (const { stateId, objectData } of dimmerCandidates) {
            const deviceId = this.extractDeviceId(stateId);
            
            if (!deviceGroups.has(deviceId)) {
                deviceGroups.set(deviceId, []);
            }
            deviceGroups.get(deviceId).push({ stateId, objectData });
        }
        
        const selectedDimmers = [];
        
        // Select best dimmer for each device
        for (const [deviceId, dimmers] of deviceGroups) {
            const bestDimmer = this.selectBestDimmerForDevice(dimmers);
            if (bestDimmer) {
                selectedDimmers.push(bestDimmer);
            }
        }
        
        return selectedDimmers;
    }
    
    selectBestDimmerForDevice(dimmers) {
        // Prefer max=100 (percentage), fallback to max=255 (raw)
        const percentageDimmer = dimmers.find(d => d.objectData.common?.max === 100);
        if (percentageDimmer) {
            return percentageDimmer;
        }
        
        const rawDimmer = dimmers.find(d => d.objectData.common?.max === 255);
        if (rawDimmer) {
            return rawDimmer;
        }
        
        // If no standard max values, use first available
        return dimmers[0] || null;
    }
    
    extractDeviceId(stateId) {
        const parts = stateId.split('.');
        const lastPart = parts[parts.length - 1];
        
        // Known dimmer state names
        const dimmerStates = ['level', 'brightness', 'dimmer', 'bri', 'dim'];
        
        if (dimmerStates.includes(lastPart.toLowerCase())) {
            return parts.slice(0, -1).join('.');
        }
        
        return stateId;
    }
    
    async createElementFromState(stateId, objectData = null) {
        // Get object metadata if not provided
        if (!objectData) {
            objectData = await this.ioBrokerClient.getObject(stateId);
        }
        
        const common = objectData?.common || {};
        
        // Determine element type from role with filtering
        const elementType = this.mapRoleToElementType(common.role, common);
        
        // Generate caption from name or state ID
        const caption = common.name || this.generateCaptionFromStateId(stateId);
        
        const elementConfig = {
            type: elementType,
            caption: caption,
            stateId: stateId,
            unit: common.unit || '',
            interactive: common.write !== false && this.isInteractiveRole(common.role)
        };
        
        // Add type-specific properties
        if (elementType === 'gauge' || elementType === 'dimmer') {
            elementConfig.min = common.min || 0;
            elementConfig.max = common.max || 100;
        }
        
        return elementConfig;
    }
    
    mapRoleToElementType(role, common = {}) {
        // Switch roles - already filtered to boolean only
        if (role === 'switch' || role === 'switch.light') {
            return 'switch';
        }
        
        // Dimmer role - already filtered to best option
        if (role === 'level.dimmer') {
            return 'dimmer'; // Note: This element type needs separate spec
        }
        
        // Temperature/humidity/power values
        if (role === 'value.temperature' || role === 'value.humidity' || 
            role === 'value.power' || role === 'value.voltage' || role === 'value.current') {
            return 'gauge';
        }
        
        // Motion/door/window sensors - already filtered to boolean
        if (role === 'sensor.motion' || role === 'sensor.door' || role === 'sensor.window') {
            return 'indicator';
        }
        
        // Generic sensor
        if (role === 'sensor') {
            return common.type === 'boolean' ? 'indicator' : 'gauge';
        }
        
        // Button - already filtered to boolean
        if (role === 'button') {
            return 'button';
        }
        
        // Generic value
        if (role === 'value') {
            return 'gauge';
        }
        
        return 'text'; // Fallback
    }
}
```

## Updated Command Examples

### Valid Command Usage with Filtering
```bash
# Generate lighting dashboard - only boolean switches and percentage dimmers
/generate -f light

# Expected results:
# ✅ zigbee.0.living_room.light_1.state (role=switch.light, type=boolean)
# ✅ zigbee.0.kitchen.dimmer.level (role=level.dimmer, max=100) 
# ❌ hue.0.bridge.status (role=switch, type=string) - excluded
# ❌ zigbee.0.kitchen.dimmer.raw (role=level.dimmer, max=255) - excluded (prefer max=100)
```

### Generated Dashboard Structure
```
Lighting Dashboard
├── Living Room
│   ├── Ceiling Light (switch) ← boolean switch
│   └── Floor Lamp (dimmer)    ← max=100 dimmer
├── Kitchen  
│   ├── Main Lights (switch)   ← boolean switch
│   └── Under Cabinet (dimmer) ← max=100 dimmer (not max=255)
└── Bedroom
    ├── Main Light (switch)    ← boolean switch
    └── Bedside Lamp (dimmer)  ← max=100 dimmer
```

## Integration with Existing Commands

### Update Generate Command
```javascript
// In generate-command.js
async run(parsedArgs) {
    // ... existing code ...
    
    this.info('Filtering states by role and type...');
    
    if (result.success) {
        this.success(`Generated "${result.dashboardName}"`);
        this.info(`Filtered ${result.totalStatesAnalyzed} states → ${result.totalElements} valid elements`);
        this.info(`Excluded ${result.excludedCount} states (wrong type/role)`);
        
        // Show exclusion summary
        if (result.exclusions && result.exclusions.length > 0) {
            this.info('Excluded states:');
            result.exclusions.forEach(exclusion => {
                this.info(`  - ${exclusion.stateId}: ${exclusion.reason}`);
            });
        }
    }
}
```

## Benefits of Enhanced Filtering

### Accuracy
- **Only relevant devices** included in dashboards
- **No status indicators** mixed with actual controls
- **Best dimmer states** selected automatically

### User Experience  
- **Clean dashboards** without confusing non-interactive elements
- **Consistent element types** based on actual device capabilities
- **Proper dimmer ranges** (percentage preferred over raw values)

### Reliability
- **Type safety** - only boolean switches included
- **Duplicate prevention** - one dimmer per device
- **Smart selection** - prefer user-friendly percentage dimmers

This enhancement ensures auto-generated dashboards contain only the most appropriate and useful states for dashboard control and monitoring!