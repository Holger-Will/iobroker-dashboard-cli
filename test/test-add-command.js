#!/usr/bin/env node

/**
 * Test suite for the new unified /add command
 * Run with: node test-add-command.js
 */

import { AddCommand } from '../commands/add-command.js';
import { CommandFlagParser } from '../command-flag-parser.js';

// Mock dashboard for testing
const mockDashboard = {
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addWarningMessage: (msg) => console.log(`⚠️ ${msg}`),
    isOnboarding: false,
    onboardingStep: 'complete',
    renderer: {
        initialized: false,
        elementPositions: new Map()
    },
    renderDashboard: () => {},
    debouncedRender: () => {},
    client: {
        isConnected: () => false,
        getObject: async (stateId) => {
            // Mock object metadata for testing
            if (stateId === 'javascript.0.solar.produktion') {
                return {
                    common: {
                        type: 'number',
                        role: 'value.power',
                        unit: 'W',
                        min: 0,
                        max: 5000,
                        write: false
                    }
                };
            }
            return null;
        }
    }
};

// Mock tools for testing
const mockTools = {
    listGroups: () => [
        { id: 'group1', title: 'Solar System' },
        { id: 'group2', title: 'Temperatures' }
    ],
    addGroup: async (name) => ({ 
        success: true, 
        group: { id: `group_${Date.now()}`, title: name } 
    }),
    addElement: async (groupId, config, index) => ({ 
        success: true, 
        element: { 
            id: config.id, 
            connect: () => {}, 
            on: () => {} 
        } 
    })
};

mockDashboard.tools = mockTools;

async function testAddCommand() {
    console.log('🧪 Testing New Unified /add Command\n');
    
    const cmd = new AddCommand(mockDashboard);
    
    console.log('📋 Test 1: Help flag');
    const parser1 = new CommandFlagParser();
    const result1 = parser1.parse('/add -h');
    await cmd.execute(['-h']);
    
    console.log('\n📋 Test 2: Create group');
    await cmd.execute(['-c', '-g', 'Test Group']);
    
    console.log('\n📋 Test 3: Add element with auto-detection');
    await cmd.execute(['-g', 'Solar', '-n', 'PV Power', '-s', 'javascript.0.solar.produktion']);
    
    console.log('\n📋 Test 4: Add element with specified type');
    await cmd.execute(['-g', 'Temperatures', '-n', 'Outdoor', '-s', 'temp.outdoor', '-t', 'gauge']);
    
    console.log('\n📋 Test 5: Add element with index');
    await cmd.execute(['-g', 'Solar', '-n', 'Battery', '-s', 'solar.battery', '-t', 'number', '-i', '0']);
    
    console.log('\n📋 Test 6: Missing required flags (should show error)');
    await cmd.execute(['-g', 'Solar']);
    
    console.log('\n📋 Test 7: Invalid element type (should show error)');
    await cmd.execute(['-g', 'Solar', '-n', 'Test', '-s', 'test.state', '-t', 'invalid']);
    
    console.log('\n📋 Test 8: Group not found (should show error)');
    await cmd.execute(['-g', 'NonExistent', '-n', 'Test', '-s', 'test.state']);
    
    console.log('\n✅ All /add command tests completed!');
}

testAddCommand().catch(console.error);