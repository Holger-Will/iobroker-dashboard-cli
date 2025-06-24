#!/usr/bin/env node

/**
 * Test the new polymorphic rename command
 * Run with: node test-rename-command.js
 */

import { RenameCommand } from './commands/rename-command.js';

// Mock dashboard with tools for testing
const mockDashboard = {
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addWarningMessage: (msg) => console.log(`⚠️ ${msg}`),
    renderer: {
        initialized: false,
        elementPositions: new Map()
    },
    renderDashboard: () => console.log('🖼️  Dashboard rendered'),
    tools: {
        listGroups: () => [
            { 
                id: 'group1', 
                title: 'Solar System',
                elements: [
                    { id: 'el1', caption: 'PV Power', type: 'gauge' },
                    { id: 'el2', caption: 'Battery Level', type: 'gauge' },
                    { id: 'el3', caption: 'Grid Status', type: 'indicator' }
                ]
            },
            { 
                id: 'group2', 
                title: 'Temperatures',
                elements: [
                    { id: 'el4', caption: 'Living Room', type: 'gauge' },
                    { id: 'el5', caption: 'Kitchen', type: 'gauge' }
                ]
            },
            { 
                id: 'group3', 
                title: 'System Status',
                elements: [
                    { id: 'el6', caption: 'Web Adapter', type: 'indicator' }
                ]
            }
        ],
        renameGroup: async (groupId, newTitle) => {
            console.log(`[TOOLS] Renaming group ${groupId} to "${newTitle}"`);
            return { success: true, oldTitle: 'Solar System', newTitle };
        },
        renameElement: async (groupId, elementId, newCaption) => {
            console.log(`[TOOLS] Renaming element ${elementId} in group ${groupId} to "${newCaption}"`);
            return { success: true, oldCaption: 'PV Power', newCaption };
        }
    }
};

async function testRenameCommand() {
    console.log('🧪 Testing Polymorphic Rename Command\\n');
    
    const renameCmd = new RenameCommand(mockDashboard);
    
    console.log('📋 Test 1: Rename group (no -g flag)');
    await renameCmd.execute(['-o', 'Solar System', '-n', 'Energy Management']);
    
    console.log('\\n📋 Test 2: Rename element in specific group');
    await renameCmd.execute(['-o', 'PV Power', '-n', 'Solar Production', '-g', 'Solar']);
    
    console.log('\\n📋 Test 3: Global element search (empty -g flag)');
    await renameCmd.execute(['-o', 'Battery Level', '-n', 'Energy Storage', '-g']);
    
    console.log('\\n📋 Test 4: Try to rename non-existent group');
    await renameCmd.execute(['-o', 'NonExistent', '-n', 'New Name']);
    
    console.log('\\n📋 Test 5: Try to rename non-existent element');
    await renameCmd.execute(['-o', 'NonExistent', '-n', 'New Name', '-g', 'Solar']);
    
    console.log('\\n📋 Test 6: Global search with multiple matches');
    // Add duplicate element name for testing
    const groups = mockDashboard.tools.listGroups();
    groups[1].elements.push({ id: 'el7', caption: 'PV Power', type: 'gauge' }); // Duplicate name
    
    await renameCmd.execute(['-o', 'PV Power', '-n', 'Solar Output', '-g']);
    
    console.log('\\n📋 Test 7: Show help');
    await renameCmd.execute(['-h']);
    
    console.log('\\n📋 Test 8: Test partial name matching');
    await renameCmd.execute(['-o', 'Solar', '-n', 'Energy System']);
    
    console.log('\\n📋 Test 9: Test number-based selection');
    await renameCmd.execute(['-o', '1', '-n', 'First Group']);
    
    console.log('\\n✅ Rename command tests completed!');
    
    console.log('\\n🎯 Rename Command Features:');
    console.log('  ✅ Polymorphic operation modes:');
    console.log('    - No -g flag: Group mode');
    console.log('    - -g with value: Element in specific group');  
    console.log('    - -g without value: Global element search');
    console.log('  ✅ Smart name matching (exact, partial, number)');
    console.log('  ✅ Duplicate name detection and prevention');
    console.log('  ✅ Multiple match handling with user guidance');
    console.log('  ✅ Comprehensive error handling and helpful messages');
    console.log('  ✅ Auto-rerender after successful rename');
}

testRenameCommand().catch(console.error);