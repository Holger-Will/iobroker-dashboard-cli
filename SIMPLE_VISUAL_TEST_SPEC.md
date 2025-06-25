# Simple Visual Regression Testing

**Date:** June 25, 2025
**Purpose:** Practical terminal output regression testing using text snapshots and simple automation

## Overview

Instead of complex image-based testing, we'll use a simpler approach that captures terminal output as text and compares it for regressions. This is more reliable, faster, and easier to maintain.

## Approach

### 1. Text-Based Output Capture
- Capture ANSI-formatted terminal output as text files
- Compare text snapshots for changes
- Use deterministic test data to ensure consistent output

### 2. Automated Terminal Interaction
- Use Node.js child_process to spawn the app
- Send predefined inputs and capture outputs
- Mock time-dependent and variable data

### 3. Output Validation
- Strip variable data (timestamps, process IDs)
- Normalize ANSI codes for consistent comparison
- Validate structure and content

## Implementation

### Test Framework Setup

**Install dependencies:**
```bash
npm install --save-dev strip-ansi normalize-newline
```

**Create: `test/visual/terminal-output.test.js`**
```javascript
import { expect } from 'chai';
import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Terminal Output Regression Tests', function() {
    this.timeout(30000);

    const outputDir = path.join(__dirname, 'outputs');
    const baselineDir = path.join(outputDir, 'baseline');
    const actualDir = path.join(outputDir, 'actual');

    before(async function() {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(baselineDir, { recursive: true });
        await fs.mkdir(actualDir, { recursive: true });
    });

    describe('Application Startup States', function() {
        it('should show consistent onboarding screen', async function() {
            const output = await captureOutput('01-onboarding', {
                setup: () => cleanupUserData(),
                inputs: [],
                timeout: 3000
            });

            await validateOutput('01-onboarding', output);
        });

        it('should show help command consistently', async function() {
            const output = await captureOutput('02-help-command', {
                setup: () => setupTestDashboard(),
                inputs: ['/help\n'],
                timeout: 2000
            });

            await validateOutput('02-help-command', output);
        });

        it('should show theme list consistently', async function() {
            const output = await captureOutput('03-theme-list', {
                setup: () => setupTestDashboard(),
                inputs: ['/theme -l\n'],
                timeout: 2000
            });

            await validateOutput('03-theme-list', output);
        });

        it('should show settings list consistently', async function() {
            const output = await captureOutput('04-settings-list', {
                setup: () => setupTestDashboard(),
                inputs: ['/set -l\n'],
                timeout: 2000
            });

            await validateOutput('04-settings-list', output);
        });
    });

    describe('Dashboard States', function() {
        it('should show empty dashboard consistently', async function() {
            const output = await captureOutput('05-empty-dashboard', {
                setup: () => setupEmptyDashboard(),
                inputs: ['\x1b'], // ESC to switch to dashboard mode
                timeout: 2000
            });

            await validateOutput('05-empty-dashboard', output);
        });

        it('should show sample dashboard consistently', async function() {
            const output = await captureOutput('06-sample-dashboard', {
                setup: () => setupSampleDashboard(),
                inputs: ['\x1b'], // ESC to switch to dashboard mode
                timeout: 2000
            });

            await validateOutput('06-sample-dashboard', output);
        });
    });

    describe('Error States', function() {
        it('should show invalid command error consistently', async function() {
            const output = await captureOutput('07-invalid-command', {
                setup: () => setupTestDashboard(),
                inputs: ['/invalidcommand\n'],
                timeout: 2000
            });

            await validateOutput('07-invalid-command', output);
        });

        it('should show connection error consistently', async function() {
            const output = await captureOutput('08-connection-error', {
                setup: () => cleanupUserData(),
                inputs: ['invalid-url\n'],
                timeout: 5000
            });

            await validateOutput('08-connection-error', output);
        });
    });

    // Helper function to capture terminal output
    async function captureOutput(testName, options) {
        const { setup, inputs = [], timeout = 5000 } = options;

        // Run setup
        if (setup) {
            await setup();
        }

        return new Promise((resolve, reject) => {
            const child = spawn('node', ['index.js'], {
                cwd: path.join(__dirname, '../..'),
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // Force consistent terminal size
                    COLUMNS: '120',
                    LINES: '30',
                    TERM: 'xterm-256color',
                    // Disable animations and delays for testing
                    NODE_ENV: 'test'
                }
            });

            let output = '';
            let inputIndex = 0;

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                output += data.toString();
            });

            // Send inputs with delays
            const sendNextInput = () => {
                if (inputIndex < inputs.length) {
                    const input = inputs[inputIndex++];
                    setTimeout(() => {
                        child.stdin.write(input);
                        sendNextInput();
                    }, 500); // 500ms delay between inputs
                }
            };

            // Start sending inputs after initial delay
            setTimeout(sendNextInput, 1000);

            // Timeout handling
            const timer = setTimeout(() => {
                child.kill();
                resolve(normalizeOutput(output));
            }, timeout);

            child.on('close', () => {
                clearTimeout(timer);
                resolve(normalizeOutput(output));
            });

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    // Normalize output for consistent comparison
    function normalizeOutput(output) {
        return output
            // Remove ANSI codes for text-based comparison
            .split('\n')
            .map(line => stripAnsi(line))
            // Remove timestamp variations
            .map(line => line.replace(/\d{2}:\d{2}:\d{2}/g, 'HH:MM:SS'))
            // Remove date variations
            .map(line => line.replace(/\w+ \d+ \w+ \d{4}/g, 'Day DD Mon YYYY'))
            // Remove process-specific data
            .map(line => line.replace(/PID: \d+/g, 'PID: XXXX'))
            // Normalize file paths
            .map(line => line.replace(/\/.*?\.iobroker-dashboard-cli/g, '~/.iobroker-dashboard-cli'))
            // Remove empty lines at start/end
            .join('\n')
            .trim();
    }

    // Validate output against baseline
    async function validateOutput(testName, actualOutput) {
        const actualPath = path.join(actualDir, `${testName}.txt`);
        const baselinePath = path.join(baselineDir, `${testName}.txt`);

        // Save actual output
        await fs.writeFile(actualPath, actualOutput);

        // Check if baseline exists
        const baselineExists = await fs.access(baselinePath).then(() => true).catch(() => false);

        if (baselineExists) {
            const baselineOutput = await fs.readFile(baselinePath, 'utf8');
            
            if (actualOutput !== baselineOutput) {
                // Show diff in test output
                console.log(`\nRegression detected in ${testName}:`);
                console.log('Expected (baseline):');
                console.log(baselineOutput);
                console.log('\nActual:');
                console.log(actualOutput);
                
                throw new Error(`Terminal output regression in ${testName}. Check ${actualPath} vs ${baselinePath}`);
            }
        } else {
            // Create new baseline
            await fs.writeFile(baselinePath, actualOutput);
            console.log(`Created new baseline: ${testName}.txt`);
        }
    }

    // Setup helper functions
    async function cleanupUserData() {
        const os = await import('os');
        const userDataDir = path.join(os.homedir(), '.iobroker-dashboard-cli');
        try {
            await fs.rm(userDataDir, { recursive: true, force: true });
        } catch (error) {
            // Directory might not exist
        }
    }

    async function setupTestDashboard() {
        await setupUserDataDirectory();
        await createTestDashboard('default.json', {
            version: "1.0.0",
            name: "Test Dashboard",
            layout: { columns: 4, padding: 1, rowSpacing: 1, showBorders: true },
            groups: []
        });
    }

    async function setupEmptyDashboard() {
        await setupUserDataDirectory();
        await createTestDashboard('default.json', {
            version: "1.0.0",
            name: "Empty Dashboard", 
            layout: { columns: 4, padding: 1, rowSpacing: 1, showBorders: true },
            groups: []
        });
    }

    async function setupSampleDashboard() {
        await setupUserDataDirectory();
        await createTestDashboard('default.json', {
            version: "1.0.0",
            name: "Sample Dashboard",
            layout: { columns: 4, padding: 1, rowSpacing: 1, showBorders: true },
            groups: [
                {
                    id: "test-group",
                    title: "Test Group",
                    elements: [
                        { 
                            id: "test-gauge", 
                            type: "gauge", 
                            caption: "Test Gauge", 
                            stateId: "test.state", 
                            unit: "W", 
                            value: 1000 
                        },
                        { 
                            id: "test-switch", 
                            type: "switch", 
                            caption: "Test Switch", 
                            stateId: "test.switch", 
                            value: true 
                        }
                    ]
                }
            ]
        });
    }

    async function setupUserDataDirectory() {
        const os = await import('os');
        const userDataDir = path.join(os.homedir(), '.iobroker-dashboard-cli');
        const configDir = path.join(userDataDir, 'dashboard-configs');
        
        await fs.mkdir(userDataDir, { recursive: true });
        await fs.mkdir(configDir, { recursive: true });
    }

    async function createTestDashboard(filename, config) {
        const os = await import('os');
        const configDir = path.join(os.homedir(), '.iobroker-dashboard-cli', 'dashboard-configs');
        const configPath = path.join(configDir, filename);
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
});
```

### Simpler NPM Scripts

**Update package.json:**
```json
{
  "scripts": {
    "test:visual": "mocha test/visual/terminal-output.test.js --timeout 60000",
    "test:visual:update": "rm -rf test/visual/outputs/baseline && npm run test:visual",
    "test:visual:diff": "diff -r test/visual/outputs/baseline test/visual/outputs/actual || true"
  }
}
```

### Alternative: Manual Screenshot Documentation

**Create: `test/visual/manual-screenshots.md`**
```markdown
# Manual Visual Documentation

This document contains terminal screenshots for visual reference and manual regression testing.

## How to Take Screenshots

1. **Prepare consistent environment:**
   ```bash
   export COLUMNS=120
   export LINES=30
   export TERM=xterm-256color
   ```

2. **Run specific scenarios:**
   ```bash
   # Clean start - onboarding
   rm -rf ~/.iobroker-dashboard-cli
   node index.js
   
   # Take screenshot with your terminal's screenshot feature
   # Save as: test/visual/screenshots/01-onboarding.png
   ```

3. **Document each scenario:**

### 01. First Run - Onboarding
**Setup:** Clean user data directory
**Command:** `node index.js`
**Expected:** Onboarding welcome screen with setup steps

### 02. Help Command
**Setup:** Basic dashboard loaded
**Commands:** `node index.js` → `/help`
**Expected:** Complete command help listing

### 03. Theme List
**Setup:** Basic dashboard loaded  
**Commands:** `node index.js` → `/theme -l`
**Expected:** List of all available themes with previews

### 04. Dashboard View - Empty
**Setup:** Empty dashboard configuration
**Commands:** `node index.js` → `ESC`
**Expected:** Dashboard mode with no groups, showing borders

### 05. Dashboard View - Sample Data
**Setup:** Dashboard with sample groups and elements
**Commands:** `node index.js` → `ESC`
**Expected:** Formatted dashboard with groups, gauges, switches

### 06. Error State - Invalid Command
**Setup:** Basic dashboard loaded
**Commands:** `node index.js` → `/invalidcommand`
**Expected:** Error message with command suggestions

### 07. Column Layout - 3 Columns
**Setup:** Dashboard configured for 3 columns
**Commands:** `node index.js` → `/set layout.columns 3` → `ESC`
**Expected:** Dashboard with 3-column layout

### 08. Theme - Dark Mode
**Setup:** Dashboard with dark theme
**Commands:** `node index.js` → `/theme dark` → `ESC` 
**Expected:** Dashboard with dark color scheme
```

## Benefits of Simple Approach

### **Reliability**
- Text-based comparison is deterministic
- No dependency on external screenshot tools
- Works in CI/CD environments without graphics

### **Maintainability**
- Easy to see what changed in text diffs
- Version control friendly (text files)
- Fast execution and comparison

### **Development Workflow**
- Integrated with existing test suite
- Clear baselines that can be reviewed
- Easy to update when changes are intentional

### **Documentation Value**
- Text outputs serve as functional documentation
- Easy to grep and search through outputs
- Shows exact terminal behavior

This approach provides practical visual regression testing without the complexity of image-based testing while still catching UI regressions effectively!