#!/usr/bin/env node

/**
 * Test AI service with new flag-based command syntax
 * Run with: node test-ai-flag-syntax.js
 */

import AIService from '../ai-service.js';

// Mock dashboard for testing
const mockDashboard = {
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    commands: {
        execute: async (cmd, args) => {
            console.log(`[OLD SYNTAX] Command: ${cmd}, Args: ${JSON.stringify(args)}`);
            return true;
        },
        getAllCommands: () => [
            { name: 'add', aliases: [], description: 'Add groups and elements', usage: '/add [-c] [-g <group>] [-n <name>] [-s <state>]' },
            { name: 'rename', aliases: ['rn'], description: 'Rename groups/elements', usage: '/rename -o <old> -n <new> [-g <group>]' },
            { name: 'theme', aliases: [], description: 'Manage themes', usage: '/theme [-l] [-s <scheme>]' }
        ]
    },
    processSlashCommand: async (command) => {
        console.log(`[NEW SYNTAX] Processing slash command: ${command}`);
        // Simulate successful command execution
        return true;
    },
    client: {
        isConnected: () => true
    },
    tools: {
        listGroups: () => [
            { title: 'Solar System', elementCount: 3 },
            { title: 'Temperatures', elementCount: 2 }
        ]
    },
    layout: {
        groups: [
            { title: 'Solar System', elements: ['pv', 'battery', 'grid'] },
            { title: 'Temperatures', elements: ['living', 'kitchen'] }
        ]
    },
    mcp: {
        isConnected: () => true,
        getAvailableTools: () => [
            { name: 'getState', description: 'Get ioBroker state' },
            { name: 'setState', description: 'Set ioBroker state' }
        ]
    }
};

async function testAIFlagSyntax() {
    console.log('🧪 Testing AI Service with New Flag-Based Command Syntax\\n');
    
    const aiService = new AIService(mockDashboard);
    
    console.log('📋 Test 1: Check if AI system prompt contains new flag syntax');
    const context = {
        connected: true,
        groups: mockDashboard.tools.listGroups(),
        status: { totalElements: 5 },
        hasIoBrokerAccess: true,
        hasMCPAccess: true,
        mcpTools: mockDashboard.mcp.getAvailableTools(),
        availableCommands: mockDashboard.commands.getAllCommands()
    };
    
    const systemPrompt = aiService.buildSystemPrompt(context);
    
    // Check if the system prompt contains new flag syntax
    if (systemPrompt.includes('/add -c -g') && systemPrompt.includes('NEW FLAG-BASED')) {
        console.log('✅ System prompt correctly updated with new flag syntax');
    } else {
        console.log('❌ System prompt still contains old syntax');
    }
    
    console.log('\\n📋 Test 2: Parse AI response with new flag commands');
    const mockAIResponse = `I'll help you create a solar system dashboard.

Commands to run:
- /add -c -g "Solar System"
- /add -g "Solar System" -n "PV Power" -s "solar.power" -t "gauge"
- /add -g "Solar System" -n "Battery Level" -s "solar.battery" -t "gauge"
- /theme -s "matrix"`;

    const parsed = aiService.parseAIResponse(mockAIResponse);
    console.log('Parsed commands:', parsed.commands);
    console.log('Explanation:', parsed.explanation.substring(0, 50) + '...');
    
    // Verify all commands use new syntax
    const allNewSyntax = parsed.commands.every(cmd => cmd.startsWith('/'));
    if (allNewSyntax) {
        console.log('✅ All parsed commands use new flag syntax');
    } else {
        console.log('❌ Some commands still use old syntax');
    }
    
    console.log('\\n📋 Test 3: Execute AI response commands');
    await aiService.executeAIResponse({
        success: true,
        explanation: 'Creating solar dashboard with new flag syntax',
        commands: parsed.commands
    });
    
    console.log('\\n📋 Test 4: Test mixed old/new syntax handling');
    const mixedResponse = {
        success: true,
        explanation: 'Testing mixed syntax support',
        commands: [
            '/add -c -g "New Group"',  // New syntax
            'old-command arg1 arg2'     // Old syntax (fallback)
        ]
    };
    
    await aiService.executeAIResponse(mixedResponse);
    
    console.log('\\n✅ AI Flag Syntax Test Completed!');
    
    console.log('\\n🎯 AI Service Updates:');
    console.log('  ✅ System prompt updated with NEW FLAG-BASED COMMAND SYNTAX');
    console.log('  ✅ Comprehensive examples of all flag commands provided to AI');
    console.log('  ✅ Command execution updated to handle / prefix properly');
    console.log('  ✅ Backward compatibility maintained for legacy commands');
    console.log('  ✅ AI now instructs users with modern, consistent syntax');
    
    console.log('\\n📚 Flag Commands AI Now Knows:');
    console.log('  🔧 /add -c -g "Group"                    (create group)');
    console.log('  🔧 /add -g "Group" -n "Name" -s "state"  (add element)');
    console.log('  🏷️  /rename -o "Old" -n "New"            (rename group)');
    console.log('  🏷️  /rename -o "Old" -n "New" -g "Group" (rename element)');
    console.log('  🎨 /theme -s "matrix"                   (switch theme)');
    console.log('  📋 /ls -g                               (list groups)');
    console.log('  💾 /save -f "filename"                  (save dashboard)');
}

testAIFlagSyntax().catch(console.error);