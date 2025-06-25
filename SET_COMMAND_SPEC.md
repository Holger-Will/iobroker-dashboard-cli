# Unified Set Command Specification

**Date:** June 25, 2025
**Purpose:** Universal configuration command using dot notation for all settings

## Overview

The `/set` command provides a unified interface for managing all application configuration using dot notation. This replaces multiple specialized commands (`/theme`, individual setting commands) with a single, consistent interface.

## Command Syntax

### Basic Usage
```bash
/set <key> <value>           # Set a configuration value
/set <key>                   # Get current value of a setting
/set -l                      # List all available settings  
/set --reset <key>           # Reset setting to default value
/set -h                      # Show help (standard help flag)
/set --help                  # Show help (standard help flag)
```

### Flag Schema
```javascript
{
    knownFlags: ['l', 'list', 'reset', 'h', 'help'],
    flags: {
        l: { type: 'boolean', description: 'List all available settings and their current values' },
        list: { type: 'boolean', description: 'List all available settings and their current values' },
        reset: { type: 'string', description: 'Reset specified setting to default value' },
        h: { type: 'boolean', description: 'Show help' },
        help: { type: 'boolean', description: 'Show help' }
    }
}
```

## Supported Setting Categories

### Theme Settings
```bash
/set theme dark              # Set theme (replaces /theme -s dark)
/set theme.name dark         # Explicit theme name setting
/set theme.border true       # Enable/disable borders
/set theme.colors.primary #ff0000  # Custom color override
```

### Dashboard Layout
```bash
/set layout.groupWidth 45        # Set group width
/set layout.groupPaddingX 2      # Set horizontal padding
/set layout.groupPaddingY 1      # Set vertical padding  
/set layout.showBorders true     # Show/hide borders
```

### ioBroker Connection
```bash
/set iobroker.url http://192.168.1.100:8082  # ioBroker server URL
/set iobroker.namespace admin                # ioBroker namespace
/set iobroker.timeout 5000                   # Connection timeout
```

### Hotkeys
```bash
/set hotkey.1 dashboard1.json    # Set hotkey 1 (replaces /hotkey -n 1 -f file)
/set hotkey.2 lighting.json      # Set hotkey 2
/set hotkey.F1 overview.json     # Function key hotkeys
```

### Dashboard Behavior
```bash
/set dashboard.autoSave true         # Auto-save changes
/set dashboard.configDir ./configs   # Configuration directory
/set dashboard.defaultLayout default.json  # Default dashboard
```

### MCP Integration
```bash
/set mcp.serverUrl http://localhost:8082/mcp  # MCP server URL
/set mcp.enabled true                         # Enable/disable MCP
```

## Setting Types and Validation

### Type Detection and Conversion
```javascript
const SETTING_TYPES = {
    // Booleans
    'theme.border': 'boolean',
    'layout.showBorders': 'boolean', 
    'dashboard.autoSave': 'boolean',
    'mcp.enabled': 'boolean',
    
    // Numbers
    'layout.groupWidth': 'number',
    'layout.groupPaddingX': 'number',
    'layout.groupPaddingY': 'number',
    'iobroker.timeout': 'number',
    
    // Strings
    'theme.name': 'string',
    'iobroker.url': 'string',
    'iobroker.namespace': 'string',
    'dashboard.configDir': 'string',
    'dashboard.defaultLayout': 'string',
    'mcp.serverUrl': 'string',
    
    // Special: theme shorthand
    'theme': 'theme_name',  // Maps to theme.name with validation
    
    // Special: hotkeys
    'hotkey.*': 'filename'  // Validates dashboard file exists
};
```

### Value Validation
```javascript
const SETTING_VALIDATORS = {
    'theme.name': (value) => {
        const availableThemes = getAvailableSchemes();
        if (!availableThemes.includes(value)) {
            throw new Error(`Invalid theme '${value}'. Available: ${availableThemes.join(', ')}`);
        }
        return value;
    },
    
    'layout.groupWidth': (value) => {
        const num = parseInt(value);
        if (num < 20 || num > 100) {
            throw new Error('Group width must be between 20 and 100');
        }
        return num;
    },
    
    'iobroker.url': (value) => {
        try {
            new URL(value);
            return value;
        } catch {
            throw new Error('Invalid URL format');
        }
    },
    
    'hotkey.*': (value) => {
        // Validate dashboard file exists
        if (!value.endsWith('.json')) {
            throw new Error('Hotkey value must be a .json dashboard file');
        }
        return value;
    }
};
```

## Command Examples

### Setting Values
```bash
# Theme management
/set theme dark                    # Quick theme change
/set theme.name matrix            # Explicit theme setting
/set theme.border false           # Disable borders

# Layout configuration  
/set layout.groupWidth 50         # Wider groups
/set layout.showBorders true      # Enable borders
/set layout.groupPaddingX 3       # More spacing

# Connection settings
/set iobroker.url http://192.168.1.200:8082  # Different server

# Hotkeys
/set hotkey.1 lighting.json       # F1 key loads lighting dashboard
/set hotkey.2 security.json       # F2 key loads security dashboard
```

### Getting Values
```bash
/set theme                        # Show current theme
/set layout.groupWidth            # Show current group width
/set iobroker.url                 # Show current ioBroker URL
```

### Listing and Help
```bash
/set -l                           # Show all settings and current values
/set --list                       # Show all settings and current values (long form)
/set -h                           # Show help (works with unified help system)
/set --reset theme.name           # Reset theme to default

# Unified help system integration
/help set                         # Show help via unified help system
```

## Implementation Architecture

### Core Command Class
```javascript
export class SetCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
        this.settingsManager = new UnifiedSettingsManager();
    }
    
    get name() {
        return 'set';
    }
    
    get aliases() {
        return ['config', 'cfg'];
    }
    
    get description() {
        return 'Get or set configuration values using dot notation';
    }
    
    get usage() {
        return '/set [-l|--reset <key>|-h] [<key> [<value>]]';
    }
    
    get flagSchema() {
        return {
            knownFlags: ['l', 'list', 'reset', 'h', 'help'],
            flags: {
                l: { type: 'boolean', description: 'List all settings' },
                list: { type: 'boolean', description: 'List all settings' },
                reset: { type: 'string', description: 'Reset setting to default' },
                h: { type: 'boolean', description: 'Show help' },
                help: { type: 'boolean', description: 'Show help' }
            }
        };
    }
    
    async run(parsedArgs) {
        await this.settingsManager.initialize();
        
        if (parsedArgs.hasFlag('help') || parsedArgs.hasFlag('h')) {
            return this.showHelp();
        }
        
        if (parsedArgs.hasFlag('list') || parsedArgs.hasFlag('l')) {
            return this.listAllSettings();
        }
        
        if (parsedArgs.hasFlag('reset')) {
            const key = parsedArgs.getFlag('reset');
            return this.resetSetting(key);
        }
        
        const args = parsedArgs.getArgs();
        
        if (args.length === 0) {
            this.error('Usage: /set <key> [<value>] or /set --help');
            return;
        }
        
        const key = args[0];
        
        if (args.length === 1) {
            // Get value
            return this.getSetting(key);
        } else {
            // Set value
            const value = args.slice(1).join(' ');
            return this.setSetting(key, value);
        }
    }
}
```

### Setting Management Methods
```javascript
async setSetting(key, value) {
    try {
        // Handle special shorthand cases
        const normalizedKey = this.normalizeKey(key);
        
        // Validate and convert value
        const validatedValue = this.validateValue(normalizedKey, value);
        
        // Apply setting
        await this.settingsManager.set(normalizedKey, validatedValue, true);
        
        // Handle side effects (theme changes, layout updates, etc.)
        await this.applySideEffects(normalizedKey, validatedValue);
        
        this.success(`[SET] ${normalizedKey} = ${validatedValue}`);
        
    } catch (error) {
        this.error(`[SET] Failed to set ${key}: ${error.message}`);
    }
}

async getSetting(key) {
    try {
        const normalizedKey = this.normalizeKey(key);
        const value = await this.settingsManager.get(normalizedKey);
        
        if (value === undefined) {
            this.warning(`[GET] Setting '${normalizedKey}' is not set`);
        } else {
            this.info(`[GET] ${normalizedKey} = ${value}`);
        }
        
    } catch (error) {
        this.error(`[GET] Failed to get ${key}: ${error.message}`);
    }
}

async listAllSettings() {
    const categories = {
        'Theme': ['theme.name', 'theme.border'],
        'Layout': ['layout.groupWidth', 'layout.groupPaddingX', 'layout.groupPaddingY', 'layout.showBorders'],
        'ioBroker': ['iobroker.url', 'iobroker.namespace', 'iobroker.timeout'],
        'Dashboard': ['dashboard.autoSave', 'dashboard.configDir', 'dashboard.defaultLayout'],
        'MCP': ['mcp.serverUrl', 'mcp.enabled']
    };
    
    this.info('Current Configuration:');
    this.info('');
    
    for (const [category, keys] of Object.entries(categories)) {
        this.info(`${category}:`);
        for (const key of keys) {
            const value = await this.settingsManager.get(key);
            const displayValue = value !== undefined ? value : '<not set>';
            this.info(`  ${key.padEnd(25)} = ${displayValue}`);
        }
        this.info('');
    }
    
    // Show hotkeys
    const hotkeys = await this.getHotkeys();
    if (hotkeys.length > 0) {
        this.info('Hotkeys:');
        hotkeys.forEach(({ key, value }) => {
            this.info(`  ${key.padEnd(25)} = ${value}`);
        });
    }
}
```

### Side Effects Handling
```javascript
async applySideEffects(key, value) {
    switch (key) {
        case 'theme.name':
        case 'theme':
            // Apply theme immediately
            const success = applyTheme(value);
            if (success) {
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderDashboard();
                this.info('[THEME] Applied immediately');
            }
            break;
            
        case 'layout.showBorders':
        case 'layout.groupWidth':
        case 'layout.groupPaddingX':
        case 'layout.groupPaddingY':
            // Update layout engine
            this.dashboard.layout.updateConfig({
                groupWidth: await this.settingsManager.get('layout.groupWidth'),
                groupPaddingX: await this.settingsManager.get('layout.groupPaddingX'),
                groupPaddingY: await this.settingsManager.get('layout.groupPaddingY'),
                showBorders: await this.settingsManager.get('layout.showBorders')
            });
            this.dashboard.renderDashboard();
            this.info('[LAYOUT] Updated immediately');
            break;
            
        case 'iobroker.url':
            // Suggest reconnection
            this.warning('[IOBROKER] URL changed. Restart to reconnect to new server.');
            break;
    }
}
```

## Migration from Existing Commands

### Phase-out Plan
1. **Phase 1**: Implement `/set` command with full functionality
2. **Phase 2**: Update help system to prefer `/set` over specialized commands
3. **Phase 3**: Add deprecation warnings to `/theme`, specialized commands
4. **Phase 4**: Remove specialized commands (optional)

### Backward Compatibility
During transition, both old and new commands work:
```bash
# Old way (still works)
/theme -s dark
/hotkey -n 1 -f dashboard.json

# New way (preferred)
/set theme dark  
/set hotkey.1 dashboard.json
```

## Advanced Features

### Setting Presets
```bash
/set --preset compact     # Apply compact layout preset
/set --preset dark-theme  # Apply dark theme preset
```

### Bulk Operations
```bash
/set --import settings.json    # Import settings from file
/set --export settings.json    # Export current settings
```

### Validation and Help
```bash
/set theme invalid        # Shows available themes
/set layout.groupWidth 200  # Shows valid range
/set --validate           # Check all settings for issues
```

This unified `/set` command provides a consistent, discoverable interface for all configuration management while maintaining the power and flexibility of the underlying `UnifiedSettingsManager`!