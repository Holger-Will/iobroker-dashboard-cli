# Dashboard-configs Folder Management Specification

**Date:** June 25, 2025
**Purpose:** Define how dashboard-configs folder should be managed in git and during application lifecycle

## Current Situation Analysis

### Current State
- `dashboard-configs/` folder exists and is tracked in git
- Contains 5 files: `dashboard1.json`, `default.json`, `hotkey1.json`, `onboarding.json`, `settings.json`
- `.gitignore` has commented out entry: `# dashboard-configs/*.json`
- Onboarding system does not create dashboard-configs folder
- Config manager expects folder to exist at `./dashboard-configs`

### Problems with Current Approach
1. **User configs in git** - Personal dashboard configurations are tracked in version control
2. **Shared state** - Multiple users/environments share same config files
3. **Privacy issues** - User-specific settings (like API keys) could be committed
4. **Development pollution** - Development configs affect clean installations

## Specification

### 1. Git Ignore Configuration

**Requirement:** Dashboard-configs folder should be completely ignored by git

```gitignore
# User dashboard configurations (generated during onboarding)
dashboard-configs/
```

**Changes needed:**
- Update `.gitignore` to ignore entire `dashboard-configs/` folder (not just `*.json`)
- Remove current dashboard-configs from git tracking
- Ensure clean repository state for new users

### 2. Onboarding Process Integration

**Requirement:** First startup should create dashboard-configs folder and default configuration

#### 2.1 Folder Creation
- **When:** During onboarding initialization
- **Where:** In `OnboardingSystem.startOnboarding()` method
- **Action:** Create `./dashboard-configs/` directory if it doesn't exist

```javascript
// In onboarding-system.js
async startOnboarding() {
    // Ensure dashboard-configs directory exists
    await this.ensureConfigDirectoryExists();
    
    // Existing onboarding logic...
}

async ensureConfigDirectoryExists() {
    const configDir = './dashboard-configs';
    try {
        await fs.mkdir(configDir, { recursive: true });
        this.dashboard.addInfoMessage('Created dashboard configuration directory');
    } catch (error) {
        // Directory already exists or other error
    }
}
```

#### 2.2 Default Configuration Creation
- **When:** After successful onboarding completion
- **Content:** Minimal working dashboard with sample elements
- **File:** `dashboard-configs/default.json`

**Default config structure:**
```json
{
    "version": "1.0.0",
    "name": "Default Dashboard",
    "created": "2025-06-25T10:00:00.000Z",
    "layout": {
        "groupWidth": 35,
        "groupPaddingX": 1,
        "groupPaddingY": 1,
        "showBorders": true
    },
    "groups": [
        {
            "id": "welcome",
            "title": "Welcome",
            "elements": [
                {
                    "id": "welcome-message",
                    "type": "indicator", 
                    "caption": "Dashboard Ready",
                    "stateId": "system.adapter.admin.0.alive"
                }
            ]
        }
    ]
}
```

### 3. Application Behavior Changes

#### 3.1 Config Manager Updates
**Current behavior:** Expects `dashboard-configs/` to exist
**New behavior:** Create directory if missing, handle gracefully

```javascript
// In config-manager.js initialization
async initialize(layoutEngine) {
    this.layoutEngine = layoutEngine;
    
    // Create config directory if it doesn't exist
    try {
        await fs.mkdir(this.config.configDir, { recursive: true });
    } catch (error) {
        console.warn(`Config directory creation warning: ${error.message}`);
    }
    
    // Existing logic...
}
```

#### 3.2 First Run Detection
**Logic:** If `dashboard-configs/` doesn't exist OR is empty, trigger onboarding

```javascript
// In index.js checkForExistingConfiguration()
async checkForExistingConfiguration() {
    try {
        // Check if config directory exists and has files
        const configDir = this.config.configDir;
        const stats = await fs.stat(configDir);
        if (!stats.isDirectory()) return false;
        
        const files = await fs.readdir(configDir);
        const configFiles = files.filter(f => f.endsWith('.json'));
        
        return configFiles.length > 0;
    } catch (error) {
        // Directory doesn't exist = first run
        return false;
    }
}
```

### 4. Git Repository Cleanup

**Actions required:**
1. Remove `dashboard-configs/` from git tracking
2. Update `.gitignore` to ignore the folder
3. Ensure clean state for new clones

```bash
# Commands to clean up git history
git rm -r dashboard-configs/
git commit -m "Remove dashboard-configs from version control - will be generated during onboarding"
echo "dashboard-configs/" >> .gitignore
git add .gitignore
git commit -m "Add dashboard-configs to .gitignore"
```

### 5. Settings File Management

**Current issue:** `settings.json` exists in both root and dashboard-configs
**Resolution:** 
- Root `settings.json` for global app settings (can be tracked in git with defaults)
- `dashboard-configs/settings.json` for user-specific settings (ignored by git)

**Specification:**
- Global settings (root): Connection defaults, theme defaults, app configuration
- User settings (dashboard-configs): API keys, personal preferences, last used dashboard

### 6. Developer Experience

#### 6.1 Fresh Development Setup
1. Clone repository
2. Run `npm install`
3. Run `npm start`
4. Onboarding creates `dashboard-configs/` and default config automatically

#### 6.2 Existing Development Setup
1. Current `dashboard-configs/` will be removed from git
2. Developers keep their local configs (untracked)
3. Fresh default config created if folder is deleted

## Implementation Plan

### Phase 1: Git Cleanup
1. Update `.gitignore` 
2. Remove dashboard-configs from git tracking
3. Commit changes

### Phase 2: Onboarding Updates
1. Add folder creation to onboarding system
2. Add default config generation
3. Update first-run detection logic

### Phase 3: Config Manager Updates  
1. Add graceful directory creation
2. Handle missing config directory
3. Update error handling

### Phase 4: Testing
1. Test fresh installation flow
2. Test existing installation compatibility
3. Verify git ignore functionality

## Benefits

1. **Clean repository** - No user-specific configs in version control
2. **Privacy protection** - API keys and personal settings stay local
3. **Better onboarding** - Automatic setup for new users
4. **Development friendly** - Developers can have personal configs without conflicts
5. **Professional approach** - Follows standard practices for config management