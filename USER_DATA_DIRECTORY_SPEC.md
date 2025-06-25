# User Data Directory Specification

**Date:** June 25, 2025
**Purpose:** Move all user data from repository to user-space directory for data safety and professional architecture

## Overview

**Current Problem:** User configurations and settings are stored in the repository directory, causing:
- Risk of data loss during git operations
- User data mixed with application code
- Unprofessional architecture
- Complications for packaging/distribution

**Solution:** Move all user data to standard user-space directory following OS conventions.

## User Data Directory Structure

### Cross-Platform Directory Location

```javascript
// Using Node.js os.homedir() + path resolution
const os = require('os');
const path = require('path');

// Base user data directory
const USER_DATA_DIR = path.join(os.homedir(), '.iobroker-dashboard-cli');

// Directory structure:
~/.iobroker-dashboard-cli/
├── dashboard-configs/           # Dashboard configurations
│   ├── default.json            # Default/initial dashboard
│   ├── production.json         # User's production dashboard
│   ├── development.json        # Development/testing dashboard
│   └── *.json                  # Other saved dashboards
├── settings.json               # User settings (API keys, preferences)
├── logs/                       # Application logs (future)
│   └── dashboard.log
└── cache/                      # Temporary cache data (future)
    └── state-cache.json
```

### Platform-Specific Locations

| Platform | Location |
|----------|----------|
| Linux    | `~/.iobroker-dashboard-cli/` |
| macOS    | `~/.iobroker-dashboard-cli/` |
| Windows  | `%USERPROFILE%\.iobroker-dashboard-cli\` |

## Configuration Updates Required

### 1. Config Manager Changes

**Current paths:**
```javascript
// config-manager.js current
configDir: options.configDir || './dashboard-configs',
settingsFile: options.settingsFile || './settings.json',
```

**New paths:**
```javascript
// config-manager.js updated
import os from 'os';
import path from 'path';

const USER_DATA_DIR = path.join(os.homedir(), '.iobroker-dashboard-cli');

// In constructor
this.config = {
    configDir: options.configDir || path.join(USER_DATA_DIR, 'dashboard-configs'),
    settingsFile: options.settingsFile || path.join(USER_DATA_DIR, 'settings.json'),
    userDataDir: USER_DATA_DIR,
    autoSave: options.autoSave !== false,
    autoSaveDelay: options.autoSaveDelay || 5000,
    ...options
};
```

### 2. Directory Creation Logic

**Add user data directory initialization:**
```javascript
// In config-manager.js initialize()
async initialize(layoutEngine) {
    this.layoutEngine = layoutEngine;
    
    // Create user data directory structure
    await this.ensureUserDataDirectory();
    
    // Existing logic...
}

async ensureUserDataDirectory() {
    try {
        // Create base user data directory
        await fs.mkdir(this.config.userDataDir, { recursive: true });
        
        // Create subdirectories
        await fs.mkdir(this.config.configDir, { recursive: true });
        
        const logsDir = path.join(this.config.userDataDir, 'logs');
        await fs.mkdir(logsDir, { recursive: true });
        
        const cacheDir = path.join(this.config.userDataDir, 'cache');
        await fs.mkdir(cacheDir, { recursive: true });
        
        console.log(`[CONFIG] User data directory: ${this.config.userDataDir}`);
    } catch (error) {
        console.error(`Failed to create user data directory: ${error.message}`);
        throw error;
    }
}
```

### 3. Settings Management Update

**Current settings loading:**
```javascript
// Loads from './settings.json' in repo
```

**New settings loading:**
```javascript
// In config-manager.js
async loadSettings() {
    try {
        const settingsPath = this.config.settingsFile;
        const data = await fs.readFile(settingsPath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // Return default settings if file doesn't exist
            return this.getDefaultSettings();
        }
        throw error;
    }
}

getDefaultSettings() {
    return {
        theme: 'default',
        iobrokerUrl: 'http://192.168.178.38:8082',
        hotkeys: {},
        lastUsedDashboard: 'default.json',
        preferences: {
            autoSave: true,
            autoSaveDelay: 5000,
            commandMode: false
        }
    };
}
```

## Application Updates Required

### 1. Main Application (index.js)

**Update default paths:**
```javascript
// In IobrkerDashboard constructor
import os from 'os';
import path from 'path';

const USER_DATA_DIR = path.join(os.homedir(), '.iobroker-dashboard-cli');

constructor(options = {}) {
    this.config = {
        iobrokerUrl: options.iobrokerUrl || 'http://192.168.178.38:8082',
        configDir: options.configDir || path.join(USER_DATA_DIR, 'dashboard-configs'),
        defaultLayout: options.defaultLayout || 'default.json',
        userDataDir: USER_DATA_DIR,
        // ... rest of config
    };
}
```

### 2. Onboarding System

**Update onboarding to create user directory:**
```javascript
// In onboarding-system.js
async startOnboarding() {
    // Ensure user data directory exists before starting
    await this.dashboard.configManager.ensureUserDataDirectory();
    
    // Force command mode for onboarding
    this.dashboard.commandMode = true;
    // ... rest of onboarding
}
```

### 3. Command Updates

**Commands that reference config paths need updates:**
- `load-command.js` - Dashboard file loading
- `save-command.js` - Dashboard file saving  
- `ls-command.js` - Listing configurations
- `hotkey-command.js` - Hotkey settings

Example for `ls-command.js`:
```javascript
// Update any hardcoded './dashboard-configs' references
const configDir = this.dashboard.configManager.config.configDir;
```

## Migration Strategy

### 1. First Run Detection

**Enhanced first-run logic:**
```javascript
// In index.js
async checkForExistingConfiguration() {
    try {
        const userDataDir = this.config.userDataDir;
        const configDir = this.config.configDir;
        
        // Check if user data directory exists
        const userDirExists = await this.directoryExists(userDataDir);
        if (!userDirExists) return false;
        
        // Check if any dashboard configs exist
        const configFiles = await fs.readdir(configDir);
        const dashboardFiles = configFiles.filter(f => f.endsWith('.json'));
        
        return dashboardFiles.length > 0;
    } catch (error) {
        return false; // First run
    }
}

async directoryExists(dirPath) {
    try {
        const stats = await fs.stat(dirPath);
        return stats.isDirectory();
    } catch (error) {
        return false;
    }
}
```

### 2. Default Dashboard Creation

**Create initial dashboard in user space:**
```javascript
// In onboarding completion
async completeOnboarding() {
    // Create default dashboard in user directory
    const defaultDashboard = this.createDefaultDashboard();
    const defaultPath = path.join(
        this.dashboard.config.configDir, 
        'default.json'
    );
    
    await fs.writeFile(defaultPath, JSON.stringify(defaultDashboard, null, 2));
    
    // Save settings to user directory
    await this.saveOnboardingSettings();
}
```

## Repository Cleanup

### 1. Remove Repository Files

**Files to remove from git:**
```bash
git rm -r dashboard-configs/
git rm settings.json
git commit -m "Move user data to user-space directory (~/.iobroker-dashboard-cli/)"
```

### 2. Update .gitignore

**No longer needed in .gitignore:**
```gitignore
# Remove these lines (no longer in repo):
# dashboard-configs/
# settings.json
```

### 3. Documentation Updates

**Update README.md with new data location:**
```markdown
## User Data Location

ioBroker Dashboard CLI stores all user data in:
- **Linux/macOS:** `~/.iobroker-dashboard-cli/`
- **Windows:** `%USERPROFILE%\.iobroker-dashboard-cli\`

This includes:
- Dashboard configurations
- User settings and preferences  
- Hotkey assignments
- Application logs
```

## Benefits

### 1. Data Safety
- User data survives git operations (pull, clone, reset)
- No risk of accidentally committing personal configurations
- Safe to delete/reinstall application without losing data

### 2. Professional Architecture
- Follows standard OS conventions for application data
- Clean separation of code vs user data
- Enables proper packaging/distribution

### 3. Multi-User Support
- Each user has isolated configuration
- No conflicts on shared systems
- Proper permissions handling

### 4. Backup/Sync Friendly
- Users can easily backup `~/.iobroker-dashboard-cli/`
- Cloud sync services can handle user data directory
- Clear data location for troubleshooting

## Implementation Phases

### Phase 1: Core Path Updates
1. Update config-manager.js paths
2. Add user directory creation logic
3. Update settings management

### Phase 2: Application Updates  
1. Update main application paths
2. Update all command references
3. Update onboarding system

### Phase 3: Repository Cleanup
1. Remove dashboard-configs/ from git
2. Remove settings.json from git  
3. Update documentation

### Phase 4: Testing
1. Test fresh installation
2. Test onboarding flow
3. Test all commands with new paths
4. Test cross-platform compatibility

## Cross-Platform Considerations

### Path Handling
```javascript
// Always use path.join() for cross-platform compatibility
const configPath = path.join(USER_DATA_DIR, 'dashboard-configs', filename);

// Never use string concatenation:
// const configPath = USER_DATA_DIR + '/dashboard-configs/' + filename; // WRONG
```

### Permissions
- User home directory is always writable by user
- No special permissions needed
- Works in corporate/restricted environments

### Environment Variables (Future)
```javascript
// Allow override via environment variable
const USER_DATA_DIR = process.env.IOBROKER_DASHBOARD_DATA_DIR || 
                     path.join(os.homedir(), '.iobroker-dashboard-cli');
```

This provides professional data management while maintaining simplicity and ensuring data safety.