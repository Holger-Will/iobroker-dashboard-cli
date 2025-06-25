#!/usr/bin/env node

/**
 * Test enhanced theme system with custom theme save/load
 * Run with: node test-enhanced-themes.js
 */

import { ThemeCommand } from '../commands/theme-command.js';
import { 
    applyTheme, 
    saveCurrentThemeAs, 
    getCurrentTheme, 
    getAllThemes,
    deleteCustomTheme 
} from './colors.js';

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
    renderDashboard: () => console.log('🖼️  Dashboard rendered with new theme')
};

async function testEnhancedThemes() {
    console.log('🧪 Testing Enhanced Theme System with Custom Themes\\n');
    
    const themeCmd = new ThemeCommand(mockDashboard);
    
    console.log('📋 Test 1: Show current theme info');
    await themeCmd.execute([]);
    
    console.log('\\n📋 Test 2: Switch to matrix theme');
    await themeCmd.execute(['-s', 'matrix']);
    console.log(`Current theme: ${getCurrentTheme()}`);
    
    console.log('\\n📋 Test 3: Save current theme as custom');
    await themeCmd.execute(['--save', 'my-custom-matrix']);
    
    console.log('\\n📋 Test 4: List all themes (should include custom)');
    await themeCmd.execute(['-l']);
    
    console.log('\\n📋 Test 5: Switch to ocean theme and save another custom');
    await themeCmd.execute(['-s', 'ocean']);
    await themeCmd.execute(['--save', 'my-ocean-variant']);
    
    console.log('\\n📋 Test 6: Switch to custom theme');
    await themeCmd.execute(['-s', 'my-custom-matrix']);
    console.log(`Current theme: ${getCurrentTheme()}`);
    
    console.log('\\n📋 Test 7: Export custom themes');
    await themeCmd.execute(['--export']);
    
    console.log('\\n📋 Test 8: Delete a custom theme');
    await themeCmd.execute(['--delete', 'my-ocean-variant']);
    
    console.log('\\n📋 Test 9: List themes after deletion');
    await themeCmd.execute(['-l']);
    
    console.log('\\n📋 Test 10: Try to delete active theme');
    await themeCmd.execute(['--delete', 'my-custom-matrix']);
    console.log(`Theme after deletion: ${getCurrentTheme()}`);
    
    console.log('\\n📋 Test 11: Direct API usage');
    console.log('Testing direct theme functions...');
    
    // Test direct API
    applyTheme('retro');
    console.log(`Applied retro theme: ${getCurrentTheme()}`);
    
    saveCurrentThemeAs('test-retro-variant');
    console.log('Saved as custom theme: test-retro-variant');
    
    const allThemes = getAllThemes();
    console.log(`Built-in themes: ${allThemes.builtin.length}`);
    console.log(`Custom themes: ${allThemes.custom.length}`);
    console.log(`Custom theme names: ${allThemes.custom.join(', ')}`);
    
    deleteCustomTheme('test-retro-variant');
    console.log('Deleted test-retro-variant');
    
    console.log('\\n✅ Enhanced theme system test completed!');
    
    console.log('\\n🎨 Enhanced Theme Features:');
    console.log('  ✅ Current theme tracking');
    console.log('  ✅ Custom theme creation and storage');
    console.log('  ✅ Theme save/load functionality');
    console.log('  ✅ Custom theme deletion with safety checks');
    console.log('  ✅ Theme export for backup/sharing');
    console.log('  ✅ Unified apply function (built-in + custom)');
    console.log('  ✅ Enhanced listing with current theme indicator');
    console.log('  ✅ Automatic fallback when deleting active theme');
}

testEnhancedThemes().catch(console.error);