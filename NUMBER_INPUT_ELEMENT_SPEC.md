# Number Input Dashboard Element Specification

**Date:** June 25, 2025
**Purpose:** Define the number input element for dashboard controls (thermostats, setpoints, numeric inputs)

## Overview

The number input element provides an interactive numeric input control for dashboard use. Primary use cases include thermostat setpoints, dimmer values, timer settings, and other numeric controls that users need to modify.

## Element Type Definition

### Basic Properties
```javascript
{
    type: 'number',
    caption: 'Temperature Setpoint',
    stateId: 'zigbee.0.living_room.thermostat.setpoint',
    unit: '°C',
    min: 10,
    max: 30,
    step: 0.5,
    interactive: true
}
```

### Extended Properties
```javascript
{
    type: 'number',
    caption: 'Temperature Setpoint',
    stateId: 'zigbee.0.living_room.thermostat.setpoint',
    unit: '°C',
    min: 10,              // Minimum allowed value
    max: 30,              // Maximum allowed value  
    step: 0.5,            // Increment/decrement step size
    decimals: 1,          // Number of decimal places to display
    interactive: true,    // Whether element accepts user input
    value: 21.5,          // Current value (from ioBroker state)
    pending: false,       // Whether a state change is pending
    error: null,          // Validation error message
    disabled: false       // Whether input is disabled
}
```

## Visual Design Specification

### Layout Structure
```
┌─ Caption ─────────────────────────────┐
│ Temperature Setpoint                  │
├───────────────────────────────────────┤
│  [-]  [  21.5  ]  [+]   °C            │
│   ↑       ↑      ↑     ↑              │
│  Dec   Value    Inc   Unit            │
└───────────────────────────────────────┘
```

### Size and Spacing
- **Element width**: 25-30 characters (consistent with other elements)
- **Caption line**: Full width, left-aligned
- **Control line**: Centered within element
- **Button width**: 3 characters each `[-]` `[+]`
- **Value width**: 8-10 characters (right-aligned within field)
- **Unit**: Right-aligned, 4-6 characters max

### Visual States

#### Normal State
```
Temperature Setpoint
 [-]  [  21.5  ]  [+]   °C
```

#### Selected/Active State (during navigation)
```
Temperature Setpoint
▶[-]◀ [  21.5  ]  [+]   °C
```

#### Value Selected State (for up/down arrows)
```
Temperature Setpoint
 [-]  ▶[ 21.5 ]◀ [+]   °C
      ↑value selected
```

#### Pending State (waiting for ioBroker confirmation)
```
Temperature Setpoint
 [-]  [ 21.5⋯ ]  [+]   °C
      ↑pending indicator
```

#### Error State (validation failed)
```
Temperature Setpoint
 [-]  [ !! ]  [+]   °C
    ↑error indicator
```

#### Disabled State
```
Temperature Setpoint
 [×]  [  21.5  ]  [×]   °C
   ↑disabled indicators
```

## Interaction Specification

### Navigation and Selection
1. **Tab navigation** - Element can be selected via Tab key
2. **Visual feedback** - Selected element shows selection indicators
3. **Left/Right arrows** - Move between `[-]`, value field, `[+]`
4. **Up/Down arrows** on value field - Increment/decrement by step

### Input Methods

#### Button-Only Control
- **Space or Enter** on `[-]` - Decrease by step amount
- **Space or Enter** on `[+]` - Increase by step amount
- **Up/Down arrows** on value field - Increment/decrement by step
- **Respects min/max bounds** - Cannot go beyond configured limits

#### No Direct Input
- **Value field is display-only** - Cannot type numbers directly
- **No text editing mode** - All changes via buttons only
- **Button-based interaction** - Simple and error-free

### Value Validation

#### Input Validation Rules
```javascript
function validateNumberInput(value, config) {
    const numValue = parseFloat(value);
    
    // Check if valid number
    if (isNaN(numValue)) {
        return { valid: false, error: 'Invalid number' };
    }
    
    // Check min/max bounds
    if (config.min !== undefined && numValue < config.min) {
        return { valid: false, error: `Minimum value is ${config.min}` };
    }
    
    if (config.max !== undefined && numValue > config.max) {
        return { valid: false, error: `Maximum value is ${config.max}` };
    }
    
    // Check step alignment (if step is defined)
    if (config.step !== undefined && config.step > 0) {
        const stepsFromMin = (numValue - (config.min || 0)) / config.step;
        if (Math.abs(stepsFromMin - Math.round(stepsFromMin)) > 0.001) {
            return { valid: false, error: `Value must be in steps of ${config.step}` };
        }
    }
    
    return { valid: true, value: numValue };
}
```

#### Real-time Validation
- **Validate on each keystroke** during direct input
- **Show error immediately** for invalid values
- **Prevent submission** of invalid values
- **Visual error indication** in the value field

## ioBroker Integration

### State Synchronization
```javascript
export class NumberInputElement extends BaseElement {
    constructor(config) {
        super(config);
        this.type = 'number';
        this.selectedPart = 'value'; // 'dec', 'value', 'inc'
        this.pendingValue = null;
        this.validationError = null;
    }
    
    async setValue(newValue) {
        // Validate input
        const validation = this.validateValue(newValue);
        if (!validation.valid) {
            this.validationError = validation.error;
            this.emit('validationError', validation.error);
            return false;
        }
        
        // Clear previous error
        this.validationError = null;
        
        // Set pending state
        this.pendingValue = validation.value;
        this.pending = true;
        this.emit('valueChanged');
        
        try {
            // Send to ioBroker
            const success = await this.client.setState(this.stateId, validation.value);
            
            if (success) {
                // Success - wait for confirmation from state change event
                // The pending state will be cleared when we receive the state update
                return true;
            } else {
                // Failed to send
                this.pending = false;
                this.pendingValue = null;
                this.validationError = 'Failed to send value';
                this.emit('valueChanged');
                return false;
            }
        } catch (error) {
            this.pending = false; 
            this.pendingValue = null;
            this.validationError = error.message;
            this.emit('valueChanged');
            return false;
        }
    }
    
    onStateChanged(newValue) {
        // Clear pending state when we receive confirmation
        if (this.pending && newValue === this.pendingValue) {
            this.pending = false;
            this.pendingValue = null;
        }
        
        // Update displayed value
        this.value = newValue;
        this.emit('valueChanged');
    }
    
    validateValue(value) {
        return validateNumberInput(value, {
            min: this.min,
            max: this.max,
            step: this.step
        });
    }
    
    // Navigate between parts
    navigateLeft() {
        if (this.selectedPart === 'inc') this.selectedPart = 'value';
        else if (this.selectedPart === 'value') this.selectedPart = 'dec';
        this.emit('valueChanged');
    }
    
    navigateRight() {
        if (this.selectedPart === 'dec') this.selectedPart = 'value';
        else if (this.selectedPart === 'value') this.selectedPart = 'inc';
        this.emit('valueChanged');
    }
    
    // Handle activation
    async activate() {
        if (this.selectedPart === 'dec') {
            return await this.decrement();
        } else if (this.selectedPart === 'inc') {
            return await this.increment();
        }
        return false;
    }
    
    // Handle up/down arrows on value
    async handleUpDown(direction) {
        if (this.selectedPart === 'value') {
            if (direction === 'up') {
                return await this.increment();
            } else if (direction === 'down') {
                return await this.decrement();
            }
        }
        return false;
    }
    
    increment() {
        const step = this.step || 1;
        const newValue = (this.value || 0) + step;
        return this.setValue(newValue);
    }
    
    decrement() {
        const step = this.step || 1;
        const newValue = (this.value || 0) - step;
        return this.setValue(newValue);
    }
    
    formatValue(value) {
        if (value === null || value === undefined) return '---';
        
        const decimals = this.decimals !== undefined ? this.decimals : 
                        (this.step < 1 ? 1 : 0);
        
        return parseFloat(value).toFixed(decimals);
    }
}
```

### Timeout Handling
```javascript
// Handle pending state timeout
const PENDING_TIMEOUT = 5000; // 5 seconds

async setValue(newValue) {
    // ... validation and sending code ...
    
    // Set timeout for pending state
    if (this.pendingTimeout) {
        clearTimeout(this.pendingTimeout);
    }
    
    this.pendingTimeout = setTimeout(() => {
        if (this.pending) {
            this.pending = false;
            this.pendingValue = null;
            this.validationError = 'Timeout waiting for confirmation';
            this.emit('valueChanged');
        }
    }, PENDING_TIMEOUT);
}
```

## Rendering Implementation

### Console Rendering Method
```javascript
render(x, y, width, height, selected = false) {
    const lines = [];
    
    // Caption line
    lines.push(this.caption.padEnd(width));
    
    // Control line
    const formattedValue = this.formatDisplayValue();
    const unit = this.unit || '';
    
    // Build control parts
    const decBtn = '[-]';
    const incBtn = '[+]';
    const valueDisplay = `${formattedValue}${unit}`;
    
    // Apply selection indicators
    const decoratedDec = this.selectedPart === 'dec' && selected ? `▶${decBtn}◀` : ` ${decBtn} `;
    const decoratedValue = this.selectedPart === 'value' && selected ? `▶${valueDisplay}◀` : ` ${valueDisplay} `;
    const decoratedInc = this.selectedPart === 'inc' && selected ? `▶${incBtn}◀` : ` ${incBtn} `;
    
    // Build complete control line
    const controlLine = `${decoratedDec}  ${decoratedValue}  ${decoratedInc}`;
    
    // Center and add to lines
    lines.push(this.centerText(controlLine, width));
    
    // Render to console
    for (let i = 0; i < lines.length && i < height; i++) {
        this.moveCursor(x, y + i);
        this.writeText(this.colorize(lines[i], this.getStateColor()));
    }
}

formatDisplayValue() {
    if (this.validationError) {
        return '!!'; // Error indicator
    }
    
    if (this.pending) {
        return this.formatValue(this.pendingValue) + '⋯'; // Pending indicator
    }
    
    return this.formatValue(this.value);
}
```

## Use Cases and Examples

### Thermostat Setpoint
```javascript
{
    type: 'number',
    caption: 'Living Room Setpoint',
    stateId: 'zigbee.0.living_room.thermostat.setpoint',
    unit: '°C',
    min: 5,
    max: 35, 
    step: 0.5,
    decimals: 1,
    value: 21.5
}
```

### Dimmer Level
```javascript
{
    type: 'number',
    caption: 'Kitchen Dimmer',
    stateId: 'hue.0.kitchen_light.level',
    unit: '%',
    min: 0,
    max: 100,
    step: 5,
    decimals: 0,
    value: 75
}
```

### Timer Setting
```javascript
{
    type: 'number',
    caption: 'Auto-off Timer',
    stateId: 'javascript.0.kitchen.timer_minutes',
    unit: 'min',
    min: 0,
    max: 120,
    step: 5,
    decimals: 0,
    value: 30
}
```

### Pressure Setting
```javascript
{
    type: 'number',
    caption: 'Water Pressure',
    stateId: 'modbus.0.pump.pressure_setpoint',
    unit: 'bar',
    min: 0.5,
    max: 6.0,
    step: 0.1,
    decimals: 1,
    value: 2.5
}
```

## Integration with Dashboard Tools

### Adding Number Input Elements
```javascript
// In dashboard-tools.js
async addElement(groupId, elementConfig) {
    // ... existing validation ...
    
    if (elementConfig.type === 'number') {
        // Validate number-specific config
        if (elementConfig.min !== undefined && elementConfig.max !== undefined) {
            if (elementConfig.min >= elementConfig.max) {
                return { success: false, error: 'Min value must be less than max value' };
            }
        }
        
        if (elementConfig.step !== undefined && elementConfig.step <= 0) {
            return { success: false, error: 'Step value must be positive' };
        }
    }
    
    // ... continue with element creation ...
}
```

### Auto-Generation Integration
```javascript
// For thermostat setpoints in auto-generation
if (common.role === 'level.temperature' && common.type === 'number') {
    return {
        type: 'number',
        caption: this.generateCaption(stateId),
        stateId: stateId,
        unit: common.unit || '°C',
        min: common.min || 5,
        max: common.max || 35,
        step: 0.5,
        decimals: 1,
        interactive: true
    };
}
```

## Accessibility and Usability

### Keyboard Navigation
- **Tab/Shift+Tab** - Navigate between elements
- **Left/Right arrows** - Navigate within number input (between buttons and value)
- **Up/Down arrows** - Increment/decrement value when on value field
- **Enter** - Activate direct input mode or confirm button press
- **Escape** - Cancel direct input, return to navigation mode

### Visual Feedback
- **Clear selection indicators** when element is active
- **Immediate validation feedback** during input
- **Pending state visualization** while waiting for confirmation
- **Error state indication** for invalid values
- **Consistent color coding** across all states

### Error Recovery
- **Graceful error handling** for network issues
- **Timeout recovery** for unresponsive devices
- **Clear error messages** for validation failures
- **Easy value restoration** via Escape key

This specification provides a robust, user-friendly number input element suitable for various dashboard control scenarios!