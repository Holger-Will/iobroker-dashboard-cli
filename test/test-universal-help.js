#!/usr/bin/env node

/**
 * Test universal -h flag implementation for all commands
 * Run with: node test-universal-help.js
 */

import { QuitCommand } from '../commands/quit-command.js';
import { StatusCommand } from '../commands/status-command.js';
import { AddCommand } from '../commands/add-command.js';

// Mock dashboard for testing
const mockDashboard = {
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addWarningMessage: (msg) => console.log(`⚠️ ${msg}`),
    stop: () => console.log('Dashboard stopped'),
    connected: true,
    config: { iobrokerUrl: 'http://192.168.178.38:8082' },
    tools: {
        getStatus: () => ({
            groups: 2,
            totalElements: 5,
            layout: { columns: 2, totalHeight: 20, terminalSize: '80x24', needsScrolling: false },
            config: { currentLayout: 'test.json', isDirty: false }
        })
    },
    configManager: {
        loadSettings: async () => ({ lastUsedDashboard: 'test.json' })
    }
};

async function testUniversalHelp() {
    console.log('🧪 Testing Universal -h Flag Implementation\n');
    
    console.log('📋 Test 1: QuitCommand -h flag');
    const quitCmd = new QuitCommand(mockDashboard);
    await quitCmd.execute(['-h']);
    
    console.log('\n📋 Test 2: StatusCommand -h flag');
    const statusCmd = new StatusCommand(mockDashboard);
    await statusCmd.execute(['-h']);
    
    console.log('\n📋 Test 3: AddCommand -h flag');
    const addCmd = new AddCommand(mockDashboard);
    await addCmd.execute(['-h']);
    
    console.log('\n📋 Test 4: Multiple flags with -h (should show help first)');
    await addCmd.execute(['-g', 'Solar', '-h', '-n', 'Test']);
    
    console.log('\n✅ All universal help tests completed!');
}

testUniversalHelp().catch(console.error);