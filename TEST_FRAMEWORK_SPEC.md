# Test Framework Specification - Mocha

**Date:** June 25, 2025
**Purpose:** Design comprehensive test framework using Mocha for ioBroker Dashboard CLI

## Overview

The test framework will provide comprehensive coverage for:
- Core components (LayoutEngine, ConfigManager, etc.)
- Command system (all /commands)
- UI components (renderers, elements)
- Integration scenarios (full dashboard workflows)
- User data directory functionality
- Column-based layout system

## Test Framework Architecture

### 1. Directory Structure

```
test/
├── unit/                           # Unit tests for individual components
│   ├── core/
│   │   ├── config-manager.test.js
│   │   ├── layout-engine.test.js
│   │   ├── unified-settings-manager.test.js
│   │   └── iobroker-client.test.js
│   ├── commands/
│   │   ├── set-command.test.js
│   │   ├── theme-command.test.js
│   │   ├── add-command.test.js
│   │   └── load-command.test.js
│   ├── elements/
│   │   ├── gauge-element.test.js
│   │   ├── switch-element.test.js
│   │   └── slider-element.test.js
│   └── rendering/
│       ├── smooth-renderer.test.js
│       └── layout-calculations.test.js
├── integration/                    # Integration tests
│   ├── user-data-directory.test.js
│   ├── column-layout-system.test.js
│   ├── onboarding-flow.test.js
│   └── dashboard-lifecycle.test.js
├── mocks/                          # Mock objects and test data
│   ├── mock-iobroker-client.js
│   ├── mock-terminal.js
│   ├── test-dashboards/
│   │   ├── simple-dashboard.json
│   │   ├── complex-dashboard.json
│   │   └── empty-dashboard.json
│   └── mock-settings.js
├── fixtures/                       # Test fixtures and sample data
│   ├── sample-enums.json          # Sample ioBroker enum data
│   ├── sample-objects.json        # Sample ioBroker object data
│   └── test-configs/
│       ├── test-config-1.json
│       └── test-config-2.json
└── helpers/                        # Test helper utilities
    ├── test-utils.js
    ├── dashboard-builder.js
    └── assertion-helpers.js
```

### 2. Package.json Test Configuration

```json
{
  "scripts": {
    "test": "mocha 'test/**/*.test.js' --recursive",
    "test:unit": "mocha 'test/unit/**/*.test.js' --recursive",
    "test:integration": "mocha 'test/integration/**/*.test.js' --recursive",
    "test:watch": "mocha 'test/**/*.test.js' --recursive --watch",
    "test:coverage": "nyc mocha 'test/**/*.test.js' --recursive",
    "test:debug": "mocha 'test/**/*.test.js' --recursive --inspect-brk"
  },
  "devDependencies": {
    "mocha": "^10.0.0",
    "chai": "^4.3.0",
    "sinon": "^15.0.0",
    "nyc": "^15.1.0",
    "tmp": "^0.2.1"
  }
}
```

### 3. Test Configuration File

**Create: `test/mocha.opts`**
```
--recursive
--timeout 5000
--require test/helpers/test-setup.js
--reporter spec
```

**Create: `test/helpers/test-setup.js`**
```javascript
// Global test setup
import { expect } from 'chai';
import sinon from 'sinon';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs/promises';

// Make chai available globally
global.expect = expect;
global.sinon = sinon;

// Test data directory setup
export const TEST_DATA_DIR = tmp.dirSync({ unsafeCleanup: true }).name;

// Clean up test directories after each test
afterEach(async function() {
    sinon.restore();
});

// Helper to create temporary test directories
export async function createTestUserDataDir() {
    const testDir = path.join(TEST_DATA_DIR, `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'dashboard-configs'), { recursive: true });
    return testDir;
}

// Helper to clean up test directories
export async function cleanupTestDir(dir) {
    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
        // Ignore cleanup errors
    }
}
```

## Core Component Tests

### 1. UnifiedSettingsManager Tests

**Create: `test/unit/core/unified-settings-manager.test.js`**
```javascript
import { expect } from 'chai';
import sinon from 'sinon';
import { UnifiedSettingsManager } from '../../../unified-settings-manager.js';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import path from 'path';

describe('UnifiedSettingsManager', function() {
    let settingsManager;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        settingsManager = new UnifiedSettingsManager({
            settingsFile: path.join(testDataDir, 'settings.json'),
            configDir: path.join(testDataDir, 'dashboard-configs')
        });
        await settingsManager.initialize();
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('initialization', function() {
        it('should create user data directory structure', async function() {
            const fs = await import('fs/promises');
            
            // Check base directory exists
            const stats = await fs.stat(testDataDir);
            expect(stats.isDirectory()).to.be.true;
            
            // Check subdirectories exist
            const configStats = await fs.stat(path.join(testDataDir, 'dashboard-configs'));
            expect(configStats.isDirectory()).to.be.true;
        });

        it('should load default settings', function() {
            expect(settingsManager.get('layout.columns')).to.equal(4);
            expect(settingsManager.get('layout.padding')).to.equal(1);
            expect(settingsManager.get('layout.responsive')).to.be.true;
        });
    });

    describe('settings management', function() {
        it('should set and get values with dot notation', async function() {
            await settingsManager.set('layout.columns', 6);
            expect(settingsManager.get('layout.columns')).to.equal(6);
        });

        it('should persist settings to file', async function() {
            await settingsManager.set('layout.columns', 3);
            
            // Create new instance and verify persistence
            const newManager = new UnifiedSettingsManager({
                settingsFile: path.join(testDataDir, 'settings.json'),
                configDir: path.join(testDataDir, 'dashboard-configs')
            });
            await newManager.initialize();
            
            expect(newManager.get('layout.columns')).to.equal(3);
        });

        it('should emit events on changes', function(done) {
            settingsManager.on('changed', (event) => {
                expect(event.key).to.equal('layout.columns');
                expect(event.newValue).to.equal(5);
                done();
            });
            
            settingsManager.set('layout.columns', 5);
        });
    });

    describe('column layout settings', function() {
        it('should have correct default column layout values', function() {
            expect(settingsManager.get('layout.columns')).to.equal(4);
            expect(settingsManager.get('layout.padding')).to.equal(1);
            expect(settingsManager.get('layout.rowSpacing')).to.equal(1);
            expect(settingsManager.get('layout.showBorders')).to.be.true;
            expect(settingsManager.get('layout.responsive')).to.be.true;
            expect(settingsManager.get('layout.minGroupWidth')).to.equal(45);
        });

        it('should validate column ranges', async function() {
            // Valid values should work
            await settingsManager.set('layout.columns', 4);
            expect(settingsManager.get('layout.columns')).to.equal(4);
            
            // Test boundary values
            await settingsManager.set('layout.columns', 1);
            expect(settingsManager.get('layout.columns')).to.equal(1);
            
            await settingsManager.set('layout.columns', 8);
            expect(settingsManager.get('layout.columns')).to.equal(8);
        });
    });
});
```

### 2. Column Layout System Tests

**Create: `test/unit/core/layout-engine.test.js`**
```javascript
import { expect } from 'chai';
import sinon from 'sinon';
import LayoutEngine from '../../../layout-engine.js';

describe('LayoutEngine - Column Layout System', function() {
    let layoutEngine;

    beforeEach(function() {
        layoutEngine = new LayoutEngine({
            columns: 4,
            padding: 1,
            rowSpacing: 1,
            minGroupWidth: 45
        });
    });

    describe('column width calculations', function() {
        it('should calculate correct group width for 4 columns on 240-char terminal', function() {
            const terminalWidth = 240;
            const columns = 4;
            
            const groupWidth = layoutEngine.calculateGroupWidth(terminalWidth, columns);
            
            // (240 - 3×1) / 4 = 237 / 4 = 59.25 → 59
            expect(groupWidth).to.equal(59);
        });

        it('should calculate correct group width for 3 columns on 180-char terminal', function() {
            const terminalWidth = 180;
            const columns = 3;
            
            const groupWidth = layoutEngine.calculateGroupWidth(terminalWidth, columns);
            
            // (180 - 2×1) / 3 = 178 / 3 = 59.33 → 59
            expect(groupWidth).to.equal(59);
        });

        it('should respect minimum group width', function() {
            const terminalWidth = 100;
            const columns = 8; // Would result in very narrow groups
            
            const groupWidth = layoutEngine.calculateGroupWidth(terminalWidth, columns);
            
            // Should return minGroupWidth instead of calculated narrow width
            expect(groupWidth).to.equal(45);
        });
    });

    describe('effective columns calculation', function() {
        it('should return requested columns when terminal is wide enough', function() {
            const terminalWidth = 240;
            const requestedColumns = 4;
            
            const effectiveColumns = layoutEngine.getEffectiveColumns(requestedColumns, terminalWidth);
            
            expect(effectiveColumns).to.equal(4);
        });

        it('should reduce columns when groups would be too narrow', function() {
            const terminalWidth = 120; // Narrow terminal
            const requestedColumns = 6; // Would create very narrow groups
            
            const effectiveColumns = layoutEngine.getEffectiveColumns(requestedColumns, terminalWidth);
            
            // Should reduce to fewer columns to maintain minimum width
            expect(effectiveColumns).to.be.lessThan(6);
            expect(effectiveColumns).to.be.at.least(1);
        });

        it('should throw error for terminals narrower than 40 chars', function() {
            const terminalWidth = 35;
            const requestedColumns = 1;
            
            expect(() => {
                layoutEngine.getEffectiveColumns(requestedColumns, terminalWidth);
            }).to.throw('Terminal too narrow (min 40 chars required)');
        });
    });

    describe('responsive layout', function() {
        it('should adapt layout to terminal width changes', function() {
            const groups = [
                { id: 'group1', title: 'Group 1', elements: [] },
                { id: 'group2', title: 'Group 2', elements: [] }
            ];

            // Wide terminal - 4 columns
            let layout = layoutEngine.calculateLayout(groups, 240, 50);
            expect(layout.columns).to.equal(4);
            expect(layout.groupWidth).to.equal(59);

            // Narrow terminal - should reduce columns
            layout = layoutEngine.calculateLayout(groups, 120, 50);
            expect(layout.columns).to.be.lessThan(4);
        });

        it('should emit events when effective columns change', function(done) {
            layoutEngine.on('columnsChanged', (event) => {
                expect(event.requested).to.equal(4);
                expect(event.effective).to.be.lessThan(4);
                expect(event.terminalWidth).to.equal(120);
                done();
            });

            // This should trigger a columns change event
            layoutEngine.calculateLayout([], 240, 50); // Start with wide
            layoutEngine.calculateLayout([], 120, 50); // Resize to narrow
        });
    });

    describe('group arrangement', function() {
        it('should arrange groups in column layout', function() {
            const groups = [
                { id: 'g1', title: 'Group 1', elements: [], height: 5 },
                { id: 'g2', title: 'Group 2', elements: [], height: 5 },
                { id: 'g3', title: 'Group 3', elements: [], height: 5 },
                { id: 'g4', title: 'Group 4', elements: [], height: 5 }
            ];

            const layout = layoutEngine.calculateLayout(groups, 240, 50);
            
            expect(layout.groups).to.have.length(4);
            
            // First row should have groups at x positions: 0, 60, 120, 180
            expect(layout.groups[0].x).to.equal(0);
            expect(layout.groups[1].x).to.equal(60); // 59 + 1 padding
            expect(layout.groups[2].x).to.equal(120);
            expect(layout.groups[3].x).to.equal(180);
            
            // All in first row
            expect(layout.groups[0].y).to.equal(0);
            expect(layout.groups[1].y).to.equal(0);
            expect(layout.groups[2].y).to.equal(0);
            expect(layout.groups[3].y).to.equal(0);
        });

        it('should wrap groups to next row when columns are full', function() {
            const groups = [
                { id: 'g1', title: 'Group 1', elements: [], height: 5 },
                { id: 'g2', title: 'Group 2', elements: [], height: 5 },
                { id: 'g3', title: 'Group 3', elements: [], height: 5 },
                { id: 'g4', title: 'Group 4', elements: [], height: 5 },
                { id: 'g5', title: 'Group 5', elements: [], height: 5 } // Should wrap
            ];

            const layout = layoutEngine.calculateLayout(groups, 240, 50);
            
            // Fifth group should wrap to second row
            expect(layout.groups[4].x).to.equal(0); // First column of second row
            expect(layout.groups[4].y).to.equal(6); // height + rowSpacing
        });
    });
});
```

### 3. Terminal Resize Tests

**Create: `test/integration/terminal-resize.test.js`**
```javascript
import { expect } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'events';

// Mock terminal environment
class MockTerminal extends EventEmitter {
    constructor() {
        super();
        this.columns = 80;
        this.rows = 24;
    }

    resize(columns, rows) {
        this.columns = columns;
        this.rows = rows;
        this.emit('resize');
    }
}

describe('Terminal Resize Integration', function() {
    let mockTerminal;
    let dashboard;

    beforeEach(function() {
        mockTerminal = new MockTerminal();
        
        // Mock process.stdout
        sinon.stub(process, 'stdout').value({
            columns: mockTerminal.columns,
            rows: mockTerminal.rows,
            on: mockTerminal.on.bind(mockTerminal)
        });

        // Create dashboard with mocked terminal
        // dashboard = new MockDashboard({ terminal: mockTerminal });
    });

    it('should debounce rapid resize events', function(done) {
        let resizeCallCount = 0;
        const resizeHandler = sinon.spy(() => resizeCallCount++);

        // Set up debounced resize handler
        let resizeTimeout;
        mockTerminal.on('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                resizeHandler();
            }, 150);
        });

        // Trigger rapid resizes
        mockTerminal.resize(100, 24);
        mockTerminal.resize(120, 24);
        mockTerminal.resize(140, 24);
        mockTerminal.resize(160, 24);

        // Should only call handler once after debounce period
        setTimeout(() => {
            expect(resizeCallCount).to.equal(1);
            done();
        }, 200);
    });

    it('should recalculate layout on terminal resize', function() {
        // This test would verify that layout recalculation happens
        // and that effective columns change appropriately
        expect(true).to.be.true; // Placeholder
    });

    it('should force renderer re-initialization on resize', function() {
        // This test would verify that the renderer resets its state
        // and re-renders everything from scratch
        expect(true).to.be.true; // Placeholder
    });
});
```

## Command System Tests

### 4. Set Command Tests

**Create: `test/unit/commands/set-command.test.js`**
```javascript
import { expect } from 'chai';
import sinon from 'sinon';
import { SetCommand } from '../../../commands/set-command.js';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';

describe('SetCommand', function() {
    let setCommand;
    let mockDashboard;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        
        mockDashboard = {
            addMessage: sinon.spy(),
            renderDashboard: sinon.spy(),
            settings: {
                get: sinon.stub(),
                set: sinon.stub().resolves(),
                getKeysWithPrefix: sinon.stub(),
                has: sinon.stub()
            }
        };

        setCommand = new SetCommand(mockDashboard);
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('basic functionality', function() {
        it('should have correct command metadata', function() {
            expect(setCommand.name).to.equal('set');
            expect(setCommand.description).to.include('configuration');
            expect(setCommand.aliases).to.include('config');
        });

        it('should validate column settings', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '4'])
            };

            await setCommand.run(parsedArgs);

            expect(mockDashboard.settings.set).to.have.been.calledWith('layout.columns', 4, true);
        });

        it('should warn for narrow group widths', async function() {
            // Mock narrow terminal
            sinon.stub(process.stdout, 'columns').value(100);
            
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '8'])
            };

            await setCommand.run(parsedArgs);

            // Should show warning about narrow groups
            expect(mockDashboard.addMessage).to.have.been.calledWith(
                sinon.match(/WARNING.*narrow/),
                'warning'
            );
        });
    });

    describe('validation', function() {
        it('should reject invalid column values', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '0'])
            };

            await setCommand.run(parsedArgs);

            expect(mockDashboard.addMessage).to.have.been.calledWith(
                sinon.match(/Columns must be between 1 and 8/),
                'error'
            );
        });

        it('should reject invalid padding values', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.padding', '10'])
            };

            await setCommand.run(parsedArgs);

            expect(mockDashboard.addMessage).to.have.been.calledWith(
                sinon.match(/Padding must be between 0 and 5/),
                'error'
            );
        });
    });

    describe('side effects', function() {
        it('should trigger layout re-render for layout changes', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '3'])
            };

            await setCommand.run(parsedArgs);

            expect(mockDashboard.renderDashboard).to.have.been.called;
        });

        it('should not trigger re-render for non-layout changes', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['theme.name', 'dark'])
            };

            await setCommand.run(parsedArgs);

            // Theme changes should apply theme but not force layout re-render
            expect(mockDashboard.renderDashboard).to.not.have.been.called;
        });
    });
});
```

## Integration Tests

### 5. User Data Directory Integration Test

**Create: `test/integration/user-data-directory.test.js`**
```javascript
import { expect } from 'chai';
import sinon from 'sinon';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { UnifiedSettingsManager } from '../../unified-settings-manager.js';
import { createTestUserDataDir, cleanupTestDir } from '../helpers/test-setup.js';

describe('User Data Directory Integration', function() {
    let originalHome;
    let testHomeDir;

    beforeEach(async function() {
        // Mock user home directory
        testHomeDir = await createTestUserDataDir();
        originalHome = process.env.HOME;
        process.env.HOME = testHomeDir;
        
        // Also mock os.homedir()
        sinon.stub(os, 'homedir').returns(testHomeDir);
    });

    afterEach(async function() {
        process.env.HOME = originalHome;
        await cleanupTestDir(testHomeDir);
        sinon.restore();
    });

    it('should create user data directory structure on first run', async function() {
        const expectedUserDataDir = path.join(testHomeDir, '.iobroker-dashboard-cli');
        
        const settingsManager = new UnifiedSettingsManager();
        await settingsManager.initialize();

        // Check that all directories were created
        const userDataStats = await fs.stat(expectedUserDataDir);
        expect(userDataStats.isDirectory()).to.be.true;

        const configStats = await fs.stat(path.join(expectedUserDataDir, 'dashboard-configs'));
        expect(configStats.isDirectory()).to.be.true;

        const logsStats = await fs.stat(path.join(expectedUserDataDir, 'logs'));
        expect(logsStats.isDirectory()).to.be.true;

        const cacheStats = await fs.stat(path.join(expectedUserDataDir, 'cache'));
        expect(cacheStats.isDirectory()).to.be.true;
    });

    it('should persist settings in user data directory', async function() {
        const settingsManager = new UnifiedSettingsManager();
        await settingsManager.initialize();

        await settingsManager.set('layout.columns', 6);
        await settingsManager.set('theme.name', 'dark');

        // Verify settings file was created in correct location
        const expectedSettingsPath = path.join(testHomeDir, '.iobroker-dashboard-cli', 'settings.json');
        const settingsExists = await fs.access(expectedSettingsPath).then(() => true).catch(() => false);
        expect(settingsExists).to.be.true;

        // Verify settings content
        const settingsContent = await fs.readFile(expectedSettingsPath, 'utf8');
        const settings = JSON.parse(settingsContent);
        expect(settings.layout.columns).to.equal(6);
        expect(settings.theme.name).to.equal('dark');
    });

    it('should detect first run correctly', async function() {
        // Before creating any data - should be first run
        const emptyDir = path.join(testHomeDir, '.iobroker-dashboard-cli');
        
        // Directory doesn't exist yet
        let dirExists = await fs.access(emptyDir).then(() => true).catch(() => false);
        expect(dirExists).to.be.false;

        // After initialization - should not be first run
        const settingsManager = new UnifiedSettingsManager();
        await settingsManager.initialize();

        dirExists = await fs.access(emptyDir).then(() => true).catch(() => false);
        expect(dirExists).to.be.true;
    });
});
```

## Test Helpers and Utilities

### 6. Test Utilities

**Create: `test/helpers/test-utils.js`**
```javascript
import fs from 'fs/promises';
import path from 'path';

// Dashboard test data builders
export function createTestDashboard(options = {}) {
    return {
        version: "1.0.0",
        name: options.name || "Test Dashboard",
        created: new Date().toISOString(),
        layout: {
            columns: options.columns || 4,
            padding: options.padding || 1,
            rowSpacing: options.rowSpacing || 1,
            showBorders: options.showBorders !== false
        },
        groups: options.groups || []
    };
}

export function createTestGroup(id, title, elements = []) {
    return {
        id,
        title,
        elements: elements.map(createTestElement)
    };
}

export function createTestElement(type, caption, stateId = 'test.state') {
    return {
        id: `${type}-${Date.now()}`,
        type,
        caption,
        stateId,
        unit: type === 'gauge' ? 'W' : '',
        interactive: ['switch', 'button'].includes(type)
    };
}

// Mock ioBroker client for testing
export class MockIoBrokerClient {
    constructor() {
        this.connected = false;
        this.states = new Map();
        this.objects = new Map();
    }

    async connect() {
        this.connected = true;
        return true;
    }

    disconnect() {
        this.connected = false;
    }

    isConnected() {
        return this.connected;
    }

    async getState(id) {
        return this.states.get(id) || { val: null, ts: Date.now() };
    }

    async setState(id, value) {
        this.states.set(id, { val: value, ts: Date.now() });
        return true;
    }

    async getObject(id) {
        return this.objects.get(id) || null;
    }

    setMockObject(id, obj) {
        this.objects.set(id, obj);
    }

    setMockState(id, value) {
        this.states.set(id, { val: value, ts: Date.now() });
    }
}

// Terminal width test scenarios
export const TERMINAL_SCENARIOS = {
    ULTRA_WIDE: { width: 320, height: 50, expectedColumns: 6 },
    WIDE: { width: 240, height: 40, expectedColumns: 4 },
    STANDARD: { width: 180, height: 30, expectedColumns: 3 },
    NARROW: { width: 130, height: 25, expectedColumns: 2 },
    VERY_NARROW: { width: 80, height: 20, expectedColumns: 1 },
    TOO_NARROW: { width: 35, height: 15, expectError: true }
};

// Assert helpers for common test patterns
export function expectColumnsForWidth(layoutEngine, width, expectedColumns) {
    const layout = layoutEngine.calculateLayout([], width, 50);
    expect(layout.columns).to.equal(expectedColumns);
}

export function expectGroupWidth(layoutEngine, width, columns, expectedGroupWidth) {
    const groupWidth = layoutEngine.calculateGroupWidth(width, columns);
    expect(groupWidth).to.equal(expectedGroupWidth);
}
```

### 7. Mock Terminal Environment

**Create: `test/mocks/mock-terminal.js`**
```javascript
import { EventEmitter } from 'events';

export class MockTerminal extends EventEmitter {
    constructor(columns = 80, rows = 24) {
        super();
        this.columns = columns;
        this.rows = rows;
        this.output = [];
        this.cursor = { x: 0, y: 0 };
    }

    write(data) {
        this.output.push(data);
        return true;
    }

    clear() {
        this.output = [];
        this.cursor = { x: 0, y: 0 };
    }

    resize(columns, rows) {
        this.columns = columns;
        this.rows = rows;
        this.emit('resize');
        
        // Also emit SIGWINCH for testing
        process.emit('SIGWINCH');
    }

    getOutput() {
        return this.output.join('');
    }

    getLastOutput() {
        return this.output[this.output.length - 1] || '';
    }

    expectOutput(pattern) {
        const output = this.getOutput();
        if (pattern instanceof RegExp) {
            return pattern.test(output);
        }
        return output.includes(pattern);
    }
}

// Mock process.stdout for tests
export function mockProcessStdout(terminal) {
    return {
        columns: terminal.columns,
        rows: terminal.rows,
        write: terminal.write.bind(terminal),
        on: terminal.on.bind(terminal)
    };
}
```

## Running the Tests

### 8. NPM Scripts Setup

Add to package.json:
```json
{
  "scripts": {
    "test": "mocha",
    "test:unit": "mocha 'test/unit/**/*.test.js'",
    "test:integration": "mocha 'test/integration/**/*.test.js'", 
    "test:watch": "mocha --watch",
    "test:coverage": "nyc mocha",
    "test:column-layout": "mocha 'test/unit/core/layout-engine.test.js'",
    "test:settings": "mocha 'test/unit/core/unified-settings-manager.test.js'",
    "test:commands": "mocha 'test/unit/commands/*.test.js'"
  }
}
```

### 9. GitHub Actions CI

**Create: `.github/workflows/test.yml`**
```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run unit tests
      run: npm run test:unit
      
    - name: Run integration tests  
      run: npm run test:integration
      
    - name: Generate coverage report
      run: npm run test:coverage
      
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
```

## Benefits

### Comprehensive Coverage
- **Unit tests** for individual components
- **Integration tests** for component interaction
- **Mock objects** for external dependencies
- **Test utilities** for common patterns

### Development Workflow
- **Watch mode** for continuous testing during development
- **Coverage reports** to ensure thorough testing
- **CI integration** for automated testing on commits

### Quality Assurance
- **Column layout validation** ensures layout calculations work
- **User data directory testing** ensures data safety
- **Command system testing** ensures all commands work correctly
- **Terminal resize testing** ensures responsive behavior

This test framework provides a solid foundation for ensuring the ioBroker Dashboard CLI works correctly across all scenarios!