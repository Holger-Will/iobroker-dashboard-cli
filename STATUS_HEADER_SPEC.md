# Status Header Specification

**Date:** June 25, 2025
**Purpose:** Display important status information in a header line at the top of the dashboard

## Overview

The status header provides at-a-glance information about the current application state, displayed as the first line of the dashboard interface. It shows critical information that users need to know about the current session.

## Visual Design

### Header Layout
```
┌─ ioBroker Dashboard ─ dashboard1.json ─ ●Connected ─ MCP:3/12 ─ 14:23 25/06/2025 ─┐
│                                                                                      │
│  ┌─ Solar System ───────────────────────────────────┐                              │
│  │  PV Power                                  1.2kW  │                              │
│  │  Battery Level                               85%  │                              │
│  └──────────────────────────────────────────────────┘                              │
```

### Compact Layout (narrow terminals)
```
┌─ Dashboard: dashboard1.json ─ ●Connected ─ MCP:3/12 ─ 14:23 ─┐
│                                                               │
│  ┌─ Solar System ──────────────────────────────┐             │
│  │  PV Power                              1.2kW │             │
```

## Header Components

### 1. Application Title
- **Text**: "ioBroker Dashboard" (full width) or "Dashboard:" (compact)
- **Purpose**: Brand identification
- **Position**: Left side

### 2. Current Dashboard
- **Format**: `dashboard1.json` or `lighting.json`
- **Purpose**: Show which dashboard configuration is loaded
- **Fallback**: `<unsaved>` if no file loaded
- **Color**: Themed caption color

### 3. Connection Status
- **Connected**: `●Connected` (green dot + text)
- **Disconnected**: `○Disconnected` (red outline dot + text)
- **Connecting**: `◐Connecting...` (partial dot + text)
- **Error**: `✗Error` (X symbol + text)
- **Color**: Status-appropriate (active/error/warning)

### 4. MCP Status
- **Format**: `MCP:3/12` (available tools / total tools)
- **Disconnected**: `MCP:offline`
- **Not configured**: `MCP:disabled`
- **Purpose**: Show AI tool availability
- **Color**: Neutral or warning if issues

### 5. Time and Date
- **Format**: `14:23 25/06/2025` (HH:MM DD/MM/YYYY)
- **Compact**: `14:23` (time only)
- **Purpose**: Current time reference
- **Update**: Every minute
- **Color**: Themed neutral

## Responsive Behavior

### Width Thresholds
```javascript
const HEADER_LAYOUTS = {
    FULL: 100,      // Show all components
    COMPACT: 80,    // Abbreviate labels
    MINIMAL: 60     // Show only critical info
};
```

### Layout Adaptation
#### Full Layout (≥100 chars)
```
┌─ ioBroker Dashboard ─ dashboard1.json ─ ●Connected ─ MCP:3/12 ─ 14:23 25/06/2025 ─┐
```

#### Compact Layout (80-99 chars)
```
┌─ Dashboard: dashboard1.json ─ ●Connected ─ MCP:3/12 ─ 14:23 ─┐
```

#### Minimal Layout (60-79 chars)
```
┌─ dashboard1.json ─ ●Connected ─ MCP:3/12 ─ 14:23 ─┐
```

#### Ultra Minimal (<60 chars)
```
┌─ dashboard1.json ─ ●Connected ─ 14:23 ─┐
```

## Implementation Architecture

### Header Renderer Class
```javascript
export class StatusHeaderRenderer {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.lastUpdateTime = 0;
        this.updateInterval = 60000; // Update every minute
    }
    
    render(terminalWidth) {
        const components = this.gatherStatusComponents();
        const layout = this.determineLayout(terminalWidth);
        const headerText = this.buildHeaderText(components, layout, terminalWidth);
        
        return this.formatAsBorder(headerText, terminalWidth);
    }
    
    gatherStatusComponents() {
        return {
            appTitle: this.getAppTitle(),
            dashboard: this.getCurrentDashboard(),
            connection: this.getConnectionStatus(),
            mcp: this.getMCPStatus(),
            time: this.getCurrentTime(),
            date: this.getCurrentDate()
        };
    }
    
    determineLayout(width) {
        if (width >= 100) return 'FULL';
        if (width >= 80) return 'COMPACT';
        if (width >= 60) return 'MINIMAL';
        return 'ULTRA_MINIMAL';
    }
    
    buildHeaderText(components, layout, width) {
        const parts = [];
        
        // Add components based on layout
        switch (layout) {
            case 'FULL':
                parts.push(components.appTitle);
                parts.push(components.dashboard);
                parts.push(components.connection);
                parts.push(components.mcp);
                parts.push(`${components.time} ${components.date}`);
                break;
                
            case 'COMPACT':
                parts.push('Dashboard:');
                parts.push(components.dashboard);
                parts.push(components.connection);
                parts.push(components.mcp);
                parts.push(components.time);
                break;
                
            case 'MINIMAL':
                parts.push(components.dashboard);
                parts.push(components.connection);
                parts.push(components.mcp);
                parts.push(components.time);
                break;
                
            case 'ULTRA_MINIMAL':
                parts.push(components.dashboard);
                parts.push(components.connection);
                parts.push(components.time);
                break;
        }
        
        return parts.join(' ─ ');
    }
    
    formatAsBorder(headerText, width) {
        const style = THEMES.borderStyle;
        const maxContentWidth = width - 4; // Account for corners and padding
        
        if (headerText.length > maxContentWidth) {
            headerText = headerText.substring(0, maxContentWidth - 3) + '...';
        }
        
        const padding = Math.max(0, maxContentWidth - headerText.length);
        const paddedHeader = `─ ${headerText} ${' '.repeat(padding - 1)}─`;
        
        return colorize(
            style.topLeft + paddedHeader + style.topRight,
            THEMES.border
        );
    }
}
```

### Status Component Methods
```javascript
getAppTitle() {
    return 'ioBroker Dashboard';
}

getCurrentDashboard() {
    const currentFile = this.dashboard.configManager.currentFile;
    return currentFile || '<unsaved>';
}

getConnectionStatus() {
    if (this.dashboard.connected) {
        return colorize('●Connected', THEMES.active);
    } else if (this.dashboard.client.isConnecting) {
        return colorize('◐Connecting...', THEMES.warning);
    } else if (this.dashboard.client.hasError) {
        return colorize('✗Error', THEMES.error);
    } else {
        return colorize('○Disconnected', THEMES.error);
    }
}

getMCPStatus() {
    if (!this.dashboard.mcp || !this.dashboard.mcp.isConnected()) {
        return colorize('MCP:offline', THEMES.warning);
    }
    
    const availableTools = this.dashboard.mcp.getAvailableToolsCount();
    const totalTools = this.dashboard.mcp.getTotalToolsCount();
    
    if (availableTools === 0) {
        return colorize('MCP:no-tools', THEMES.warning);
    }
    
    const status = `MCP:${availableTools}/${totalTools}`;
    return colorize(status, THEMES.neutral);
}

getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
    });
}

getCurrentDate() {
    const now = new Date();
    return now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
    });
}
```

## Integration with Existing Renderer

### Modified Layout Calculation
```javascript
// In layout-engine.js
calculateLayout(groups, terminalWidth, terminalHeight) {
    const headerHeight = 1; // Reserve space for status header
    const inputAreaHeight = 3;
    const messageAreaHeight = Math.min(8, Math.max(3, this.dashboard.messages.length + 2));
    
    const availableHeight = terminalHeight - headerHeight - inputAreaHeight - messageAreaHeight;
    
    // ... rest of layout calculation
    
    return {
        groups: arrangedGroups,
        headerHeight: headerHeight,
        dashboardStartY: headerHeight, // Start dashboard content below header
        // ... rest of layout
    };
}
```

### Renderer Integration
```javascript
// In smooth-renderer.js
initialRender(layout, inputPrompt, inputText, messages, scrollOffset, selectedElement, commandMode) {
    // Clear screen
    process.stdout.write('\x1b[2J\x1b[H');
    process.stdout.write('\x1b[?25l');
    
    // Render status header first
    if (!commandMode) {
        this.renderStatusHeader(layout);
    }
    
    // Then render dashboard groups (starting from headerHeight)
    if (!commandMode) {
        for (const group of layout.groups) {
            this.renderGroup(group, scrollOffset, selectedElement);
        }
    }
    
    // ... rest of rendering
}

renderStatusHeader(layout) {
    if (!this.statusHeaderRenderer) {
        this.statusHeaderRenderer = new StatusHeaderRenderer(this.dashboard);
    }
    
    const headerLine = this.statusHeaderRenderer.render(layout.terminalWidth);
    
    this.moveTo(0, 0);
    this.writeText(headerLine);
}
```

## Auto-Update Behavior

### Time Updates
```javascript
// Update time every minute
setInterval(() => {
    if (this.statusHeaderRenderer) {
        const now = Date.now();
        if (now - this.statusHeaderRenderer.lastUpdateTime > 60000) {
            this.statusHeaderRenderer.lastUpdateTime = now;
            this.renderStatusHeader(this.currentLayout);
        }
    }
}, 60000);
```

### Status Change Updates
```javascript
// Update on connection status changes
this.client.on('connected', () => {
    this.renderStatusHeader(this.currentLayout);
});

this.client.on('disconnected', () => {
    this.renderStatusHeader(this.currentLayout);
});

// Update on dashboard changes
this.configManager.on('fileChanged', () => {
    this.renderStatusHeader(this.currentLayout);
});

// Update on MCP status changes
this.mcp.on('connected', () => {
    this.renderStatusHeader(this.currentLayout);
});
```

## Example Outputs

### Development Environment
```
┌─ ioBroker Dashboard ─ solar-system.json ─ ●Connected ─ MCP:8/12 ─ 14:23 25/06/2025 ─┐
```

### Production Environment  
```
┌─ ioBroker Dashboard ─ production.json ─ ●Connected ─ MCP:disabled ─ 09:15 25/06/2025 ─┐
```

### Connection Issues
```
┌─ ioBroker Dashboard ─ <unsaved> ─ ✗Error ─ MCP:offline ─ 14:23 25/06/2025 ─┐
```

### Narrow Terminal
```
┌─ solar.json ─ ●Connected ─ 14:23 ─┐
```

## Benefits

### User Experience
- **At-a-glance status** - Critical info always visible
- **Context awareness** - Know which dashboard is loaded
- **Connection monitoring** - Immediate feedback on connectivity
- **Time reference** - Always know current time
- **Tool availability** - See MCP/AI tool status

### Technical Benefits
- **Consistent positioning** - Always at top of screen
- **Responsive design** - Adapts to terminal width
- **Efficient updates** - Only updates when needed
- **Theme integration** - Uses current theme colors
- **Non-intrusive** - Doesn't interfere with dashboard content

This status header provides essential context while maintaining the clean, functional design of the dashboard interface!