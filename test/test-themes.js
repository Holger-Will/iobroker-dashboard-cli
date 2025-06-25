#!/usr/bin/env node

/**
 * Test color scheme functionality
 * Run with: node test-themes.js
 */

import { ThemeCommand } from '../commands/theme-command.js';
import { applyColorScheme, getAvailableSchemes, THEMES } from '../colors.js';

// Mock dashboard for testing
const mockDashboard = {
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addWarningMessage: (msg) => console.log(`⚠️ ${msg}`),
    renderer: {
        initialized: false,
        elementPositions: new Map()
    },
    renderDashboard: () => console.log('Dashboard re-rendered with new theme')
};

async function testThemes() {
    console.log('🧪 Testing Color Scheme System\n');
    
    const themeCmd = new ThemeCommand(mockDashboard);
    
    console.log('📋 Test 1: List available themes');
    await themeCmd.execute(['-l']);
    
    console.log('\n📋 Test 2: Show current theme info');
    await themeCmd.execute([]);
    
    console.log('\n📋 Test 3: Switch to dark theme');
    await themeCmd.execute(['-s', 'dark']);
    console.log(`Border color changed: ${THEMES.border.slice(0, 10)}...`);
    
    console.log('\n📋 Test 4: Switch to matrix theme');
    await themeCmd.execute(['-s', 'matrix']);
    console.log(`Border style: ${THEMES.borderStyle.topLeft}${THEMES.borderStyle.horizontal}${THEMES.borderStyle.topRight}`);
    
    console.log('\n📋 Test 5: Switch to ocean theme');
    await themeCmd.execute(['-s', 'ocean']);
    
    console.log('\n📋 Test 6: Try invalid theme');
    await themeCmd.execute(['-s', 'nonexistent']);
    
    console.log('\n📋 Test 7: Help flag');
    await themeCmd.execute(['-h']);
    
    console.log('\n📋 Test 8: Direct theme API');
    console.log('Available schemes:', getAvailableSchemes());
    console.log('Switching to retro theme...');
    const success = applyColorScheme('retro');
    console.log(`Theme switch ${success ? 'successful' : 'failed'}`);
    console.log(`Retro border color: ${THEMES.border.slice(0, 15)}...`);
    
    console.log('\n✅ All theme tests completed!');
    console.log('\n💡 Themes implemented:');
    getAvailableSchemes().forEach(scheme => {
        console.log(`  🎨 ${scheme}`);
    });
}

testThemes().catch(console.error);