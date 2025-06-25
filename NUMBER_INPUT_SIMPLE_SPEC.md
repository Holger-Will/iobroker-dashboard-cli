# Simplified Number Input Element Specification

**Date:** June 25, 2025
**Purpose:** Simple number input with only increment/decrement buttons (no direct typing)

## Simplified Design

### Visual Layout
```
Temperature Setpoint
 [-]    21.5°C    [+]
  ↑       ↑       ↑
 Dec    Value    Inc
```

### Element Properties
```javascript
{
    type: 'number',
    caption: 'Temperature Setpoint',
    stateId: 'zigbee.0.living_room.thermostat.setpoint',
    unit: '°C',
    min: 10,
    max: 30,
    step: 0.5,
    value: 21.5,
    interactive: true
}
```

## Simplified Interaction

### Navigation Only
- **Tab navigation** - Select element
- **Left/Right arrows** - Move between `[-]`, value display, `[+]`
- **Space or Enter** - Activate selected button
- **Up/Down arrows** - Increment/decrement when value is selected

### No Direct Input
- **No typing mode** - Value field is display-only
- **No text editing** - Cannot type numbers directly
- **Button-only control** - All changes via `[-]` and `[+]` buttons

## Simplified Visual States

### Normal State
```
Temperature Setpoint
 [-]    21.5°C    [+]
```

### Selected States
```
Temperature Setpoint
▶[-]◀   21.5°C    [+]    ← Decrement button selected

Temperature Setpoint
 [-]  ▶21.5°C◀   [+]    ← Value display selected

Temperature Setpoint  
 [-]    21.5°C  ▶[+]◀   ← Increment button selected
```

### Pending State
```
Temperature Setpoint
 [-]   21.5°C⋯   [+]    ← Waiting for ioBroker confirmation
```

### Error State
```
Temperature Setpoint
 [-]     !!      [+]    ← Error occurred
```

## Simplified Implementation

### Core Element Class
```javascript
export class NumberInputElement extends BaseElement {
    constructor(config) {
        super(config);
        this.type = 'number';
        this.selectedPart = 'value'; // 'dec', 'value', 'inc'
        this.pending = false;
        this.validationError = null;
    }
    
    // Navigate between parts
    navigateLeft() {
        if (this.selectedPart === 'inc') this.selectedPart = 'value';
        else if (this.selectedPart === 'value') this.selectedPart = 'dec';
        // Stay at 'dec' if already there
        this.emit('valueChanged');
    }
    
    navigateRight() {
        if (this.selectedPart === 'dec') this.selectedPart = 'value';
        else if (this.selectedPart === 'value') this.selectedPart = 'inc';
        // Stay at 'inc' if already there
        this.emit('valueChanged');
    }
    
    // Handle activation
    async activate() {
        if (this.selectedPart === 'dec') {
            return await this.decrement();
        } else if (this.selectedPart === 'inc') {
            return await this.increment();
        } else if (this.selectedPart === 'value') {
            // Up/Down arrows work on value part
            // Space/Enter do nothing on value part
            return false;
        }
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
    
    async increment() {
        const step = this.step || 1;
        const newValue = (this.value || 0) + step;
        
        // Check max bound
        if (this.max !== undefined && newValue > this.max) {
            return false; // Cannot increment beyond max
        }
        
        return await this.setValue(newValue);
    }
    
    async decrement() {
        const step = this.step || 1;
        const newValue = (this.value || 0) - step;
        
        // Check min bound
        if (this.min !== undefined && newValue < this.min) {
            return false; // Cannot decrement below min
        }
        
        return await this.setValue(newValue);
    }
    
    async setValue(newValue) {
        // Set pending state
        this.pending = true;
        this.emit('valueChanged');
        
        try {
            const success = await this.client.setState(this.stateId, newValue);
            
            if (!success) {
                this.pending = false;
                this.validationError = 'Failed to send value';
                this.emit('valueChanged');
                return false;
            }
            
            // Wait for confirmation (handled in onStateChanged)
            return true;
            
        } catch (error) {
            this.pending = false;
            this.validationError = error.message;
            this.emit('valueChanged');
            return false;
        }
    }
    
    onStateChanged(newValue) {
        this.pending = false;
        this.validationError = null;
        this.value = newValue;
        this.emit('valueChanged');
    }
}
```

### Simplified Rendering
```javascript
render(x, y, width, height, selected = false) {
    const lines = [];
    
    // Caption line
    lines.push(this.caption.padEnd(width));
    
    // Control line
    const formattedValue = this.formatValue();
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

formatValue() {
    if (this.validationError) return '!!';
    if (this.pending) return `${this.value || 0}⋯`;
    
    const decimals = this.step < 1 ? 1 : 0;
    return (this.value || 0).toFixed(decimals);
}

getStateColor() {
    if (this.validationError) return 'error';
    if (this.pending) return 'pending';
    return 'normal';
}
```

## Simplified Key Handling

### Dashboard Input Handler
```javascript
// In index.js handleInput() method
if (this.selectedElement && this.selectedElement.type === 'number') {
    const element = this.selectedElement.element;
    
    // Left/Right navigation
    if (key === '\x1b[D') { // Left arrow
        element.navigateLeft();
        this.renderDashboard();
        return;
    }
    
    if (key === '\x1b[C') { // Right arrow
        element.navigateRight();
        this.renderDashboard();
        return;
    }
    
    // Up/Down on value part
    if (key === '\x1b[A') { // Up arrow
        element.handleUpDown('up');
        this.renderDashboard();
        return;
    }
    
    if (key === '\x1b[B') { // Down arrow
        element.handleUpDown('down');
        this.renderDashboard();
        return;
    }
    
    // Space/Enter activation
    if (key === ' ' || key === '\r' || key === '\n') {
        element.activate();
        this.renderDashboard();
        return;
    }
}
```

## Use Case Examples

### Thermostat (0.5° steps)
```
Living Room Setpoint
▶[-]◀   21.5°C    [+]
```
- Press Space → 21.0°C
- Navigate right, press Space → 22.0°C

### Dimmer (5% steps)
```
Kitchen Dimmer
 [-]  ▶75%◀  [+]
```
- Press Up → 80%
- Press Down → 70%

### Timer (5 min steps)
```
Auto-off Timer
 [-]    30min  ▶[+]◀
```
- Press Space → 35min

## Benefits of Simplified Design

### User Experience
- **Clear interaction model** - Only buttons, no typing confusion
- **Consistent behavior** - Same interaction pattern everywhere  
- **Error-free input** - Cannot type invalid values
- **Quick adjustments** - Up/Down arrows for fast changes

### Implementation
- **Much simpler code** - No text input handling
- **Fewer edge cases** - No parsing, validation of typed input
- **Reliable operation** - Button presses are atomic operations
- **Easier testing** - Simple increment/decrement logic

### Accessibility  
- **Keyboard accessible** - Full keyboard navigation
- **Clear visual feedback** - Selection indicators show current focus
- **Predictable behavior** - Users know exactly what each key does

This simplified design provides all the functionality needed for dashboard numeric controls without the complexity of direct text input!