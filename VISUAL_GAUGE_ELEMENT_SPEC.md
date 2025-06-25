# Visual Slider Element Specification

**Date:** June 25, 2025
**Purpose:** Visual slider element with handle position display

## Overview

The visual slider element provides an interactive slider control with a visual handle representation. Primary use cases include dimmer levels, volume controls, valve positions, and other percentage-based controls.

## Visual Design

### Layout Structure
```
Dimmer Level
20%  ░░░█░░░░░░░░░░░░░░░░
 ↑        ↑
Value   Handle Position
```

### Size and Spacing
- **Element width**: 25-30 characters
- **Caption line**: Full width, left-aligned
- **Value display**: 4 characters (including %)
- **Slider track**: 20 characters
- **No buttons**: Pure keyboard control

### Slider Characters
- **Empty track**: `░` (light shade)
- **Handle**: `█` (full block) - represents slider handle position
- **Track length**: 20 characters = 100% (each char = 5%)

## Element Type Definition

### Basic Properties
```javascript
{
    type: 'visual-slider',
    caption: 'Dimmer Level',
    stateId: 'zigbee.0.living_room.dimmer.level',
    unit: '%',
    min: 0,
    max: 100,
    interactive: true
}
```

### Extended Properties
```javascript
{
    type: 'visual-slider',
    caption: 'Kitchen Dimmer',
    stateId: 'zigbee.0.kitchen.dimmer.level',
    unit: '%',
    min: 0,              // Minimum value
    max: 100,            // Maximum value
    trackLength: 20,     // Slider track length in characters
    value: 20,           // Current value (from ioBroker state)
    pending: false,      // Whether a state change is pending
    error: null,         // Validation error message
    interactive: true    // Whether element accepts user input
}
```

### Step Calculation
Steps are automatically calculated as 5% of the total range:
```javascript
// Automatic step calculation: 5% of range
const range = max - min;
const step = range * 0.05; // 5% of range

// Examples:
// Range 0-100%: step = 5%
// Range 10-20°C: step = 0.5°C  
// Range 0-255: step = 12.75 ≈ 13
```
```

## Visual States

### Normal State
```
Kitchen Dimmer
20%  ░░░█░░░░░░░░░░░░░░░░
```

### Selected State
```
Kitchen Dimmer
20% ▶░░░█░░░░░░░░░░░░░░░░◀
```

### Pending State
```
Kitchen Dimmer
25%  ░░░░█░░░░░░░░░░░░░░░⋯
```

### Error State
```
Kitchen Dimmer
!!   ░░░░░░░░░░░░░░░░░░░░
```

### Different Value Types and Ranges

#### Percentage Values (0-100%)
```
Kitchen Dimmer
0%   █░░░░░░░░░░░░░░░░░░░    ← 0% (handle at start)
50%  ░░░░░░░░░█░░░░░░░░░░    ← 50% (handle at middle)  
100% ░░░░░░░░░░░░░░░░░░░█    ← 100% (handle at end)
```

#### Temperature Values (10-20°C)
```
Room Thermostat
15°C ░░░░░░░░░█░░░░░░░░░░    ← 15°C (middle of 10-20°C range)
18°C ░░░░░░░░░░░░░░░█░░░░    ← 18°C (step = 0.5°C)
```

#### Raw Values (0-255)
```
LED Brightness  
128  ░░░░░░░░░█░░░░░░░░░░    ← 128 (middle of 0-255 range)
200  ░░░░░░░░░░░░░░░█░░░░    ← 200 (step = 13)
```

## Interaction Specification

### Simple Keyboard Control
1. **Tab navigation** - Element can be selected via Tab key
2. **Plus key (+)** - Increase value by step amount
3. **Minus key (-)** - Decrease value by step amount  
4. **No other navigation** - Element is single-focus only

### Value Changes
- **Plus key (+)** - Increase by step amount (5% of range)
- **Minus key (-)** - Decrease by step amount (5% of range)
- **Respects min/max bounds** - Cannot go beyond configured limits
- **Step alignment** - Always moves in configured step increments
- **Handle position updates** - Visual handle moves to reflect new value
- **Unit display** - Shows appropriate unit (%, °C, raw values, etc.)

## Slider Handle Calculation

### Handle Position Mapping
```javascript
function calculateSliderTrack(value, min, max, trackLength) {
    // Normalize value to 0-1 range
    const normalizedValue = (value - min) / (max - min);
    
    // Calculate handle position (0 to trackLength-1)
    const handlePosition = Math.round(normalizedValue * (trackLength - 1));
    
    // Build slider track string
    const track = '░'.repeat(trackLength);
    const trackArray = track.split('');
    trackArray[handlePosition] = '█';
    
    return trackArray.join('');
}
```

### Auto-Step Calculation and Positioning
```javascript
// Automatic step calculation: 5% of range
function calculateAutoStep(min, max) {
    const range = max - min;
    const step = range * 0.05; // 5% of range
    
    // Round to reasonable precision
    if (step >= 1) {
        return Math.round(step);
    } else if (step >= 0.1) {
        return Math.round(step * 10) / 10;
    } else {
        return Math.round(step * 100) / 100;
    }
}

// Examples of auto-step calculation:
// Range 0-100: step = 5
// Range 10-20°C: step = 0.5
// Range 0-255: step = 13 (rounded from 12.75)
// Range 0-10: step = 0.5

function calculateStepPosition(value, min, max, trackLength) {
    const normalizedValue = (value - min) / (max - min);
    const position = Math.round(normalizedValue * (trackLength - 1));
    return Math.min(Math.max(0, position), trackLength - 1);
}
```

## Implementation

### Core Element Class
```javascript
export class VisualSliderElement extends BaseElement {
    constructor(config) {
        super(config);
        this.type = 'visual-slider';
        this.pending = false;
        this.validationError = null;
        this.trackLength = config.trackLength || 20;
        
        // Auto-calculate step as 5% of range
        this.step = this.calculateAutoStep();
    }
    
    calculateAutoStep() {
        const min = this.min || 0;
        const max = this.max || 100;
        const range = max - min;
        const step = range * 0.05; // 5% of range
        
        // Round to reasonable precision
        if (step >= 1) {
            return Math.round(step);
        } else if (step >= 0.1) {
            return Math.round(step * 10) / 10;
        } else {
            return Math.round(step * 100) / 100;
        }
    }
    
    // Handle plus/minus keys only
    async handleKeyPress(key) {
        if (key === '+') {
            return await this.increment();
        } else if (key === '-') {
            return await this.decrement();
        }
        return false;
    }
    
    async increment() {
        const newValue = Math.min((this.value || 0) + this.step, this.max || 100);
        
        if (newValue === this.value) {
            return false; // Already at maximum
        }
        
        return await this.setValue(newValue);
    }
    
    async decrement() {
        const newValue = Math.max((this.value || 0) - this.step, this.min || 0);
        
        if (newValue === this.value) {
            return false; // Already at minimum
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
    
    generateSliderTrack() {
        if (this.validationError) {
            return '░'.repeat(this.trackLength); // Empty track for error
        }
        
        const value = this.value || 0;
        const min = this.min || 0;
        const max = this.max || 100;
        
        // Calculate handle position
        const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const handlePosition = Math.round(normalizedValue * (this.trackLength - 1));
        
        // Build track with handle
        const track = '░'.repeat(this.trackLength);
        const trackArray = track.split('');
        trackArray[handlePosition] = '█';
        
        return trackArray.join('');
    }
    
    formatValue() {
        if (this.validationError) return '!!';
        
        const value = this.value || 0;
        const unit = this.unit || '';
        
        // Format value based on step precision
        let formattedValue;
        if (this.step >= 1) {
            formattedValue = Math.round(value).toString();
        } else if (this.step >= 0.1) {
            formattedValue = value.toFixed(1);
        } else {
            formattedValue = value.toFixed(2);
        }
        
        if (this.pending) {
            return `${formattedValue}${unit}⋯`;
        }
        
        return `${formattedValue}${unit}`;
    }
}
```

### Rendering Implementation
```javascript
render(x, y, width, height, selected = false) {
    const lines = [];
    
    // Caption line
    lines.push(this.caption.padEnd(width));
    
    // Control line: value + slider track
    const formattedValue = this.formatValue();
    const sliderTrack = this.generateSliderTrack();
    
    // Apply selection indicator
    let decoratedTrack;
    if (selected) {
        decoratedTrack = `▶${sliderTrack}◀`;
    } else {
        decoratedTrack = ` ${sliderTrack}`;
    }
    
    // Build complete control line
    const controlLine = `${formattedValue.padEnd(4)} ${decoratedTrack}`;
    
    // Add to lines
    lines.push(controlLine.padEnd(width));
    
    // Render to console
    for (let i = 0; i < lines.length && i < height; i++) {
        this.moveCursor(x, y + i);
        this.writeText(this.colorize(lines[i], this.getStateColor()));
    }
}

getStateColor() {
    if (this.validationError) return 'error';
    if (this.pending) return 'pending';
    return 'normal';
}
```

## Use Case Examples

### Dimmer Control (0-100%, step=5)
```
Living Room Dimmer
20%  ░░░█░░░░░░░░░░░░░░░░
```
- Range: 0-100%, auto-step: 5%
- Press + key → 25% (handle moves right)
- Press - key → 15% (handle moves left)

### Temperature Control (10-20°C, step=0.5°C)
```
Room Thermostat
15.5°C ░░░░░░░░░░█░░░░░░░░░░
```
- Range: 10-20°C, auto-step: 0.5°C (5% of 10°C range)
- Press + key → 16.0°C
- Press - key → 15.0°C

### LED Brightness (0-255, step=13)
```
LED Strip
128  ░░░░░░░░░█░░░░░░░░░░
```
- Range: 0-255, auto-step: 13 (5% of 255 range)
- Press + key → 141
- Press - key → 115

### Volume Control (0-10, step=0.5)
```
Kitchen Speaker
6.5  ░░░░░░░░░░░░█░░░░░░░░
```
- Range: 0-10, auto-step: 0.5 (5% of 10 range)
- Press + key → 7.0
- Press - key → 6.0

## Benefits

### Visual Feedback
- **Immediate visual representation** of current value
- **Clear handle position** shows exact value location
- **Intuitive slider metaphor** familiar to users

### Interaction
- **Ultra-simple control** - only + and - keys
- **No navigation complexity** - single focus element
- **Step-based changes** prevent invalid values

### Flexibility
- **Configurable step sizes** (1%, 5%, 10%, etc.)
- **Any percentage range** (0-100%, 10-90%, etc.)
- **Visual track length** adjustable per element

This visual slider design provides the simplest possible interaction model for percentage-based controls with clear visual feedback!