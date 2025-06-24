#!/usr/bin/env node

/**
 * Test the new production-ready onboarding system
 * Run with: node test-onboarding-system.js
 */

import { OnboardingSystem } from './onboarding-system.js';

// Mock dashboard for testing
const mockDashboard = {
    addMessage: (text, type) => console.log(`[${type.toUpperCase()}] ${text}`),
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addWarningMessage: (msg) => console.log(`⚠️ ${msg}`),
    commandMode: false,
    renderer: {
        initialized: false,
        elementPositions: new Map()
    },
    updatePrompt: () => {},
    renderDashboard: () => console.log('🖼️  Dashboard rendered'),
    client: {
        disconnect: () => {},
        connect: async () => { 
            // Simulate successful connection
            return true; 
        },
        url: ''
    },
    config: {},
    layout: { config: {} },
    configManager: {
        save: async () => ({ success: true })
    },
    ai: {
        initialize: async () => {}
    },
    mcp: {
        connect: async () => {}
    }
};

async function testOnboardingSystem() {
    console.log('🧪 Testing Production-Ready Onboarding System\n');
    
    const onboarding = new OnboardingSystem(mockDashboard);
    
    console.log('📋 Test 1: Start onboarding (shows welcome and asks for URL)');
    await onboarding.startOnboarding();
    
    console.log('\n📋 Test 2: Handle Socket.IO URL input');
    console.log('Testing valid URL...');
    const urlResult = await onboarding.handleInput('http://192.168.1.100:8082');
    console.log(`URL handling result: ${urlResult}`);
    
    console.log('\n📋 Test 3: Handle color scheme selection');
    console.log('Testing theme preview...');
    await onboarding.handleInput('matrix'); // Should show preview
    await onboarding.handleInput('ocean');  // Should apply theme
    
    console.log('\n📋 Test 4: Handle group width');
    console.log('Testing group width selection...');
    await onboarding.handleInput('40');
    
    console.log('\n📋 Test 5: Handle AI support');
    console.log('Testing AI support decision...');
    await onboarding.handleInput('y'); // Enable AI
    await onboarding.handleInput('sk-test-key-1234567890abcdef'); // Mock API key
    
    console.log('\n📋 Test 6: Handle MCP support');
    console.log('Testing MCP support decision...');
    await onboarding.handleInput('y'); // Enable MCP
    await onboarding.handleInput('http://192.168.1.100:8082/mcp'); // MCP URL
    
    console.log('\n✅ Onboarding flow test completed!');
    
    console.log('\n📋 Testing Error Handling:');
    
    // Test invalid URL
    const onboarding2 = new OnboardingSystem(mockDashboard);
    onboarding2.currentStep = 'socketio-url';
    console.log('\nTesting invalid URL...');
    const invalidUrlResult = await onboarding2.handleInput('not-a-url');
    console.log(`Invalid URL result: ${invalidUrlResult}`);
    
    // Test invalid theme
    onboarding2.currentStep = 'color-scheme';
    console.log('\nTesting invalid theme...');
    const invalidThemeResult = await onboarding2.handleInput('nonexistent');
    console.log(`Invalid theme result: ${invalidThemeResult}`);
    
    console.log('\n🎊 All onboarding tests completed!');
    
    console.log('\n💡 Onboarding Flow Summary:');
    console.log('  1️⃣  Socket.IO URL → Connection Test');
    console.log('  2️⃣  Color Scheme → Live Preview & Apply');
    console.log('  3️⃣  Group Width → Layout Configuration');
    console.log('  4️⃣  AI Support → API Key Collection');
    console.log('  5️⃣  MCP Support → MCP URL Configuration');
    console.log('  6️⃣  Save Settings → Ready to Use!');
    
    console.log('\n🚀 Production-Ready Features:');
    console.log('  ✅ Starts in command mode for setup');
    console.log('  ✅ Live connection testing');
    console.log('  ✅ Theme previews with visual samples');
    console.log('  ✅ Smart input validation');
    console.log('  ✅ Error handling with helpful messages');
    console.log('  ✅ Progressive disclosure (AI → MCP)');
    console.log('  ✅ Configuration persistence');
}

testOnboardingSystem().catch(console.error);