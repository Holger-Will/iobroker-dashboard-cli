# Column-Based Layout System Specification

**Date:** June 25, 2025
**Purpose:** Replace width-based layout with intuitive column-based configuration

## Overview

Instead of manually specifying group widths, users specify the number of columns they want. The system automatically calculates optimal group widths based on terminal width, column count, and spacing requirements.

## User Interface

### Simple Column Configuration
```bash
/set layout.columns 4        # 4-column layout (default)
/set layout.columns 3        # 3-column layout (wider groups)
/set layout.columns 5        # 5-column layout (compact)
```

### Supporting Settings
```bash
/set layout.padding 1        # Space between columns (default: 1)
/set layout.showBorders true # Enable borders (default: true)
```

## Automatic Width Calculation

### Formula
```javascript
// Calculate optimal group width for given columns and terminal width
function calculateGroupWidth(terminalWidth, columns, padding) {
    const totalPadding = (columns - 1) * padding;
    const availableWidth = terminalWidth - totalPadding;
    const groupWidth = Math.floor(availableWidth / columns);
    
    return Math.max(MIN_GROUP_WIDTH, groupWidth);
}
```

### Constraints
```javascript
const LAYOUT_CONSTRAINTS = {
    MIN_GROUP_WIDTH: 45,     // Minimum usable group width (for long names)
    MAX_COLUMNS: 6,          // Maximum sensible columns (focus on readability)
    MIN_COLUMNS: 1,          // Minimum columns
    DEFAULT_COLUMNS: 4,      // Default: 4 columns (optimal for long names)
    DEFAULT_PADDING: 1       // Default padding between groups
};
```

## Responsive Behavior

### Terminal Width Adaptation
```javascript
// Layout adapts to terminal width changes (optimized for long names)
const LAYOUT_BREAKPOINTS = {
    // Focus on readability with fewer, wider columns
    '280+': { maxColumns: 6 },  // Ultra-wide screens (6×45+ chars)
    '240+': { maxColumns: 4 },  // Target: 240-char screens (4×59 chars) ⭐
    '180+': { maxColumns: 3 },  // Standard screens (3×58 chars)
    '130+': { maxColumns: 2 },  // Narrow screens (2×63 chars)
    '40+':  { maxColumns: 1 },  // Minimum usable width
    '0+':   { error: 'Terminal too narrow (min 40 chars required)' }  // Unusable
};

function getEffectiveColumns(requestedColumns, terminalWidth) {
    // Check for unusable terminal width first
    if (terminalWidth < 40) {
        throw new Error('Terminal too narrow (min 40 chars required)');
    }
    
    // Find the appropriate breakpoint
    for (const [widthRange, limits] of Object.entries(LAYOUT_BREAKPOINTS)) {
        const minWidth = parseInt(widthRange.replace('+', ''));
        if (terminalWidth >= minWidth) {
            if (limits.error) {
                throw new Error(limits.error);
            }
            return Math.min(requestedColumns, limits.maxColumns);
        }
    }
    return 1; // Fallback
}
```

### Width Examples for Different Terminals

#### 240-char Terminal (Target - Optimal for Long Names)
```javascript
columns: 3 → groupWidth: 79  // (240 - 2×1) / 3 = 79 chars (very spacious)
columns: 4 → groupWidth: 59  // (240 - 3×1) / 4 = 59 chars ⭐ SWEET SPOT
columns: 5 → capped at 4     // Too narrow for long names, keep at 4
columns: 6 → capped at 4     // Too narrow for long names, keep at 4
```

#### 180-char Terminal (Standard)
```javascript
columns: 3 → groupWidth: 59  // (180 - 2×1) / 3 = 59 chars (good for long names)
columns: 4 → capped at 3     // Would give 44 chars, reduce to 3 for readability
columns: 5 → capped at 3     // Too narrow, reduce to 3 columns
```

#### 130-char Terminal (Narrow)
```javascript
columns: 2 → groupWidth: 64  // (130 - 1×1) / 2 = 64 chars (still readable)
columns: 3 → capped at 2     // Would give 42 chars, reduce to 2 for long names
columns: 4 → capped at 2     // Too narrow, reduce to 2 columns
```

#### Sub-40-char Terminal (Broken)
```javascript
// Any terminal width < 40 chars is considered unusable
// Show error message and refuse to render dashboard
width < 40 → ERROR: "Terminal too narrow (min 40 chars required)"
```

## Configuration Schema

### Updated Settings Structure
```javascript
// Replace old width-based settings
const DEFAULT_LAYOUT_SETTINGS = {
    // New column-based settings
    'layout.columns': 4,           // Number of columns (replaces groupWidth)
    'layout.padding': 1,           // Space between columns (replaces groupPaddingX)
    'layout.rowSpacing': 1,        // Space between rows (replaces groupPaddingY)
    'layout.showBorders': true,    // Enable borders
    
    // Responsive behavior (default enabled)
    'layout.responsive': true,     // Default: enabled
    'layout.minGroupWidth': 45     // Minimum group width (optimized for long names)
};
```

### Backward Compatibility Note
Since there are no existing users, we can completely replace the old width-based system:
- Remove: `layout.groupWidth`, `layout.groupPaddingX`, `layout.groupPaddingY`
- Add: `layout.columns`, `layout.padding`, `layout.rowSpacing`

## Terminal Resize Handling

### Resize Event Detection
```javascript
// In index.js - Main application
class IobrkerDashboard {
    constructor(options = {}) {
        // ... existing code ...
        this.setupResizeHandler();
    }
    
    setupResizeHandler() {
        // Listen for terminal resize events
        process.stdout.on('resize', () => {
            this.handleTerminalResize();
        });
        
        // Also handle SIGWINCH signal (more reliable)
        process.on('SIGWINCH', () => {
            this.handleTerminalResize();
        });
    }
    
    async handleTerminalResize() {
        // Debounce rapid resize events
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            this.performResize();
        }, 150); // 150ms debounce
    }
    
    async performResize() {
        const newWidth = process.stdout.columns;
        const newHeight = process.stdout.rows;
        
        // Only recalculate if size actually changed
        if (newWidth !== this.lastTerminalWidth || newHeight !== this.lastTerminalHeight) {
            this.lastTerminalWidth = newWidth;
            this.lastTerminalHeight = newHeight;
            
            await this.recalculateLayout(newWidth, newHeight);
        }
    }
    
    async recalculateLayout(width, height) {
        // Get current column setting
        const requestedColumns = await this.settings.get('layout.columns');
        
        // Calculate new effective columns for this terminal size
        const oldEffectiveColumns = this.layout.effectiveColumns;
        const newEffectiveColumns = this.layout.getEffectiveColumns(requestedColumns, width);
        
        // Layout changed - no user notification needed
        
        // Force layout recalculation
        this.layout.setTerminalSize(width, height);
        
        // Force complete re-render
        this.renderer.initialized = false;
        this.renderer.elementPositions.clear();
        
        // Re-render everything
        this.renderDashboard();
    }
    
    // No resize notifications - silent layout adaptation
}
```

### Layout Engine Resize Support
```javascript
// Enhanced layout engine with resize handling
export class LayoutEngine {
    constructor(options = {}) {
        // ... existing code ...
        this.lastTerminalWidth = 0;
        this.lastTerminalHeight = 0;
        this.effectiveColumns = this.columns; // Track current effective columns
    }
    
    setTerminalSize(width, height) {
        this.lastTerminalWidth = width;
        this.lastTerminalHeight = height;
        
        // Recalculate effective columns
        const newEffectiveColumns = this.getEffectiveColumns(this.columns, width);
        
        // Only emit event if columns actually changed
        if (newEffectiveColumns !== this.effectiveColumns) {
            this.effectiveColumns = newEffectiveColumns;
            this.emit('columnsChanged', {
                requested: this.columns,
                effective: this.effectiveColumns,
                terminalWidth: width
            });
        }
    }
    
    calculateLayout(groups, terminalWidth, terminalHeight) {
        // Store terminal size
        this.setTerminalSize(terminalWidth, terminalHeight);
        
        // Use effective columns (may be reduced from requested)
        const groupWidth = this.calculateGroupWidth(terminalWidth, this.effectiveColumns);
        
        // Arrange groups with new width
        const arrangedGroups = this.arrangeGroupsInColumns(groups, this.effectiveColumns, groupWidth);
        
        return {
            groups: arrangedGroups,
            columns: this.effectiveColumns,
            requestedColumns: this.columns,
            groupWidth: groupWidth,
            terminalWidth: terminalWidth,
            terminalHeight: terminalHeight,
            wasReduced: this.effectiveColumns < this.columns
        };
    }
    
    // Method to check if resize would change layout
    wouldResizeChangeLayout(newWidth, newHeight) {
        const newEffectiveColumns = this.getEffectiveColumns(this.columns, newWidth);
        return newEffectiveColumns !== this.effectiveColumns;
    }
}
```

### Smooth Renderer Resize Handling
```javascript
// Enhanced renderer with resize awareness
export class SmoothRenderer {
    constructor(options = {}) {
        // ... existing code ...
        this.lastRenderWidth = 0;
        this.lastRenderHeight = 0;
    }
    
    updateRender(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode) {
        // Check if terminal size changed significantly
        const sizeChanged = layout.terminalWidth !== this.lastRenderWidth || 
                           layout.terminalHeight !== this.lastRenderHeight;
        
        if (sizeChanged) {
            // Terminal was resized - force complete re-render
            this.handleResizeRender(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode);
        } else {
            // Normal incremental update
            this.performNormalUpdate(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode);
        }
        
        this.lastRenderWidth = layout.terminalWidth;
        this.lastRenderHeight = layout.terminalHeight;
    }
    
    handleResizeRender(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode) {
        // Clear everything and re-render from scratch
        process.stdout.write('\x1b[2J\x1b[H'); // Clear screen
        
        // Reset internal state
        this.initialized = false;
        this.elementPositions.clear();
        
        // Perform initial render with new size
        this.initialRender(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode);
    }
    
    performNormalUpdate(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode) {
        // Existing update logic - no change needed
        // ... existing updateRender code ...
    }
}
```

## Resize Behavior Examples

### Expanding Terminal (Narrow → Wide)
```bash
# User starts with 160-char terminal, 4 columns requested
Terminal: 160 chars → 4 columns capped at 3 (groups: 52 chars each)

# User expands terminal to 240 chars
Terminal: 240 chars → 4 columns restored (groups: 59 chars each)
> [LAYOUT] Terminal resized to 240 chars - expanded to 4 columns
```

### Shrinking Terminal (Wide → Narrow)
```bash
# User starts with 240-char terminal, 6 columns
Terminal: 240 chars → 6 columns (groups: 39 chars each)

# User shrinks terminal to 160 chars  
Terminal: 160 chars → 6 columns reduced to 4 (groups: 39 chars each)
> [LAYOUT] Terminal resized to 160 chars - reduced from 6 to 4 columns
```

### Responsive Column Thresholds (Optimized for Long Names)
```javascript
// Breakpoints prioritizing readability over density
const RESPONSIVE_BREAKPOINTS = [
    { minWidth: 280, maxColumns: 6 },  // Ultra-wide (6×45+ chars)
    { minWidth: 240, maxColumns: 4 },  // Target: 4×59 chars ⭐ OPTIMAL
    { minWidth: 180, maxColumns: 3 },  // Standard (3×58 chars)  
    { minWidth: 130, maxColumns: 2 },  // Narrow (2×63 chars)
    { minWidth: 0,   maxColumns: 1 }   // Emergency fallback
];
```

### Performance Optimization
```javascript
// Debounced resize handling to prevent excessive re-renders
class ResizeHandler {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.resizeTimeout = null;
        this.DEBOUNCE_DELAY = 150; // ms
    }
    
    handleResize() {
        // Cancel previous timeout
        clearTimeout(this.resizeTimeout);
        
        // Set new timeout
        this.resizeTimeout = setTimeout(() => {
            this.performResize();
        }, this.DEBOUNCE_DELAY);
    }
    
    performResize() {
        const newWidth = process.stdout.columns;
        const newHeight = process.stdout.rows;
        
        // Only recalculate if layout would actually change
        if (this.dashboard.layout.wouldResizeChangeLayout(newWidth, newHeight)) {
            this.dashboard.recalculateLayout(newWidth, newHeight);
        }
    }
}
```

## User Experience During Resize

### Visual Feedback
```bash
# Terminal expanded - more columns available
[Dashboard: lighting] [●Connected] [MCP: 8/12] [14:23] [Tuesday 7. April 2025]

┌─ Solar ──────────────┐ ┌─ Kitchen ────────────┐ ┌─ Living ─────────────┐ ┌─ Security ───────────┐ ┌─ Climate ────────────┐ ┌─ Outdoor ────────────┐
│  PV Power   [1.24kW] │ │  Main Light   [OFF] │ │  Ceiling       [ON] │ │  Front Door [Closed] │ │  Temp        [21.8°] │ │  Temp        [18.2°] │
└──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘ └──────────────────────┘

┌─ Output ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LAYOUT] Terminal resized to 320 chars - expanded to 6 columns                                                                                                │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Graceful Degradation
```bash
# Terminal shrunk - columns automatically reduced
[Dashboard: lighting] [●Connected] [MCP: 8/12] [14:23] [Tue 7. Apr]

┌─ Solar System ────────────────────────────────────────────┐ ┌─ Kitchen ──────────────────────────────────────────────────┐ ┌─ Living Room ──────────────────────────────────────────────┐
│  PV Power Generation                             [1.24kW] │ │  Main Ceiling Light                              [OFF]    │ │  Main Ceiling Light                               [ON]    │
│  Battery State of Charge                          [85%]  │ │  Dimmer Level                                      [45%]   │ │  Floor Lamp with Dimmer                           [75%]   │
└────────────────────────────────────────────────────────────┘ └────────────────────────────────────────────────────────────┘ └────────────────────────────────────────────────────────────┘

┌─ Output ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [LAYOUT] Terminal resized to 180 chars - reduced from 6 to 3 columns                                                                                         │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Implementation Architecture
```javascript
// In layout-engine.js
export class LayoutEngine {
    constructor(options = {}) {
        this.columns = options.columns || 4;
        this.padding = options.padding || 1;
        this.rowSpacing = options.rowSpacing || 1;
        this.showBorders = options.showBorders !== false;
        this.responsive = options.responsive !== false;
        this.minGroupWidth = options.minGroupWidth || 45;
    }
    
    calculateLayout(groups, terminalWidth, terminalHeight) {
        // Calculate effective columns based on terminal width
        const effectiveColumns = this.responsive ? 
            this.getEffectiveColumns(this.columns, terminalWidth) : 
            this.columns;
        
        // Calculate optimal group width
        const groupWidth = this.calculateGroupWidth(terminalWidth, effectiveColumns);
        
        // Arrange groups in column layout
        const arrangedGroups = this.arrangeGroupsInColumns(groups, effectiveColumns, groupWidth);
        
        return {
            groups: arrangedGroups,
            columns: effectiveColumns,
            groupWidth: groupWidth,
            terminalWidth: terminalWidth,
            terminalHeight: terminalHeight
        };
    }
    
    calculateGroupWidth(terminalWidth, columns) {
        const totalPadding = (columns - 1) * this.padding;
        const availableWidth = terminalWidth - totalPadding;
        const groupWidth = Math.floor(availableWidth / columns);
        
        return Math.max(this.minGroupWidth, groupWidth);
    }
    
    getEffectiveColumns(requestedColumns, terminalWidth) {
        // Test if requested columns would make groups too narrow
        const testWidth = this.calculateGroupWidth(terminalWidth, requestedColumns);
        
        if (testWidth < this.minGroupWidth) {
            // Reduce columns until groups are wide enough
            for (let cols = requestedColumns - 1; cols >= 1; cols--) {
                const testWidth = this.calculateGroupWidth(terminalWidth, cols);
                if (testWidth >= this.minGroupWidth) {
                    return cols;
                }
            }
            return 1; // Emergency fallback
        }
        
        return requestedColumns;
    }
    
    arrangeGroupsInColumns(groups, columns, groupWidth) {
        const arrangedGroups = [];
        let currentRow = 0;
        let currentCol = 0;
        
        for (const group of groups) {
            // Calculate position
            const x = currentCol * (groupWidth + this.padding);
            const y = currentRow * (group.height + this.rowSpacing);
            
            arrangedGroups.push({
                ...group,
                x: x,
                y: y,
                width: groupWidth
            });
            
            // Move to next position
            currentCol++;
            if (currentCol >= columns) {
                currentCol = 0;
                currentRow++;
            }
        }
        
        return arrangedGroups;
    }
    
    // Allow runtime column changes
    setColumns(newColumns) {
        this.columns = newColumns;
        // Trigger layout recalculation
        this.emit('layoutChanged');
    }
}
```

### Settings Integration
```javascript
// In unified-settings-manager.js - Updated defaults
const defaults = new Map([
    // ... other settings ...
    
    // Layout settings (column-based)
    ['layout.columns', 4],
    ['layout.padding', 1], 
    ['layout.rowSpacing', 1],
    ['layout.showBorders', true],
    ['layout.responsive', true],
    ['layout.minGroupWidth', 25],
    
    // Remove old settings
    // ['dashboard.group_width', 59],      // REMOVED
    // ['dashboard.group_padding_x', 1],   // REMOVED  
    // ['dashboard.group_padding_y', 1],   // REMOVED
]);
```

### Set Command Integration
```javascript
// Enhanced /set command with column support
const SETTING_VALIDATORS = {
    'layout.columns': (value, dashboard) => {
        const num = parseInt(value);
        if (num < 1 || num > 8) {
            throw new Error('Columns must be between 1 and 8');
        }
        
        // Check if this would result in groups too narrow
        const terminalWidth = process.stdout.columns || 80;
        const groupWidth = calculateGroupWidth(terminalWidth, num);
        if (groupWidth < 45) {
            dashboard.addMessage(`[WARNING] ${num} columns results in ${groupWidth} chars per group (min 45 recommended)`, 'warning');
        }
        
        return num;
    },
    
    'layout.padding': (value) => {
        const num = parseInt(value);
        if (num < 0 || num > 5) {
            throw new Error('Padding must be between 0 and 5');
        }
        return num;
    },
    
    'layout.rowSpacing': (value) => {
        const num = parseInt(value);
        if (num < 0 || num > 5) {
            throw new Error('Row spacing must be between 0 and 5');
        }
        return num;
    }
};

// Side effects for layout changes
async applySideEffects(key, value) {
    switch (key) {
        case 'layout.columns':
        case 'layout.padding':
        case 'layout.rowSpacing':
        case 'layout.showBorders':
            // Update layout engine and re-render
            this.dashboard.layout.setColumns(await this.settingsManager.get('layout.columns'));
            this.dashboard.layout.setPadding(await this.settingsManager.get('layout.padding'));
            this.dashboard.layout.setRowSpacing(await this.settingsManager.get('layout.rowSpacing'));
            this.dashboard.renderDashboard();
            this.info('[LAYOUT] Updated immediately');
            break;
    }
}
```

## User Experience Examples

### Setting Up Different Layouts
```bash
# Wide groups for detailed information
/set layout.columns 3
> [LAYOUT] Updated to 3 columns (79 chars each) immediately

# Balanced layout (default)
/set layout.columns 4  
> [LAYOUT] Updated to 4 columns (59 chars each) immediately

# Compact overview layout
/set layout.columns 5
> [LAYOUT] Updated to 5 columns (47 chars each) immediately

# Adjust spacing
/set layout.padding 2
> [LAYOUT] Updated padding to 2 immediately

# Check current layout
/set layout.columns
> [GET] layout.columns = 4
```

### Responsive Behavior Messages
```bash
# User sets 6 columns on 160-char terminal
/set layout.columns 6
> [LAYOUT] Requested 6 columns, but reduced to 4 due to narrow terminal (160 chars)
> [LAYOUT] Increase terminal width to 240+ chars for 6 columns

# User on wide terminal  
/set layout.columns 6
> [LAYOUT] Updated to 6 columns (39 chars each) immediately
```

### Help and Discovery
```bash
/set -l
> Layout:
>   layout.columns               = 4
>   layout.padding               = 1
>   layout.rowSpacing            = 1
>   layout.showBorders           = true
>   layout.responsive            = true

/help set
> Examples:
>   /set layout.columns 3        # Wide 3-column layout
>   /set layout.columns 5        # Compact 5-column layout
>   /set layout.padding 2        # More space between columns
```

## Visual Layout Examples

### 3-Column Layout (`/set layout.columns 3`)
```
[Dashboard: lighting] [●Connected] [MCP: 8/12] [14:23] [Tuesday 7. April 2025]

┌─ Solar System ──────────────────────────────────────────────────────────┐ ┌─ Kitchen ───────────────────────────────────────────────────────────────┐ ┌─ Living Room ──────────────────────────────────────────────────────────┐
│  PV Power Generation                                            [1.24kW] │ │  Main Ceiling Light                                             [OFF]  │ │  Main Ceiling Light                                             [ON]   │
│  Battery State of Charge                                          [85%] │ │  Dimmer Level                                                    [45%] │ │  Floor Lamp with Dimmer                                         [75%] │
│  Grid Feed-in Status                                          [Active]  │ │  Current Temperature                                           [22.5°] │ │  Current Temperature                                           [21.8°] │
└─────────────────────────────────────────────────────────────────────────┘ └─────────────────────────────────────────────────────────────────────────┘ └─────────────────────────────────────────────────────────────────────────┘
```

### 5-Column Layout (`/set layout.columns 5`)
```
[Dashboard: overview] [●Connected] [MCP: 8/12] [14:23] [Tuesday 7. April 2025]

┌─ Solar ───────────────────────────────────┐ ┌─ Kitchen ─────────────────────────────────┐ ┌─ Living ──────────────────────────────────┐ ┌─ Security ────────────────────────────────┐ ┌─ Climate ─────────────────────────────────┐
│  PV Power                        [1.24kW] │ │  Main Light                        [OFF] │ │  Ceiling                             [ON] │ │  Front Door                    [Closed] │ │  Temperature                     [21.8°] │
│  Battery                           [85%] │ │  Dimmer                            [45%] │ │  Floor Lamp                        [75%] │ │  Motion                        [Active] │ │  Humidity                          [52%] │
│  Feed-in                        [Active] │ │  Temp                            [22.5°] │ │  Temp                            [21.8°] │ │  Alarm                          [Armed] │ │  Thermostat                      [Auto] │
└───────────────────────────────────────────┘ └───────────────────────────────────────────┘ └───────────────────────────────────────────┘ └───────────────────────────────────────────┘ └───────────────────────────────────────────┘
```

## Benefits

### User Experience
- **Intuitive**: "I want 4 columns" vs. calculating widths
- **Responsive**: Automatically adapts to terminal size
- **Consistent**: Same experience across different screen sizes
- **Discoverable**: Easy to understand and experiment with

### Technical Benefits
- **Flexible**: Works on any terminal width
- **Maintainable**: No hardcoded width calculations
- **Future-proof**: Adapts to new screen sizes automatically
- **Simpler**: Fewer configuration options to understand

### Performance
- **Simple**: Recalculate group width on resize (rare event)
- **Direct**: No caching needed since resize is infrequent

This column-based approach provides a much more intuitive and flexible layout system that automatically adapts to different screen sizes while giving users simple, understandable control over their dashboard layout!