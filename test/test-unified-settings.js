#!/usr/bin/env node

/**
 * Test suite for UnifiedSettingsManager
 * Run with: node test-unified-settings.js
 */

import { UnifiedSettingsManager } from '../unified-settings-manager.js';
import fs from 'fs/promises';
import path from 'path';

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    test(name, testFn) {
        this.tests.push({ name, testFn });
    }

    async run() {
        console.log('🧪 Running UnifiedSettingsManager Tests\n');

        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                console.log(`✅ ${name}`);
                this.passed++;
            } catch (error) {
                console.log(`❌ ${name}`);
                console.log(`   Error: ${error.message}`);
                this.failed++;
            }
        }

        console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);
        
        if (this.failed > 0) {
            process.exit(1);
        }
    }

    assert(condition, message) {
        if (!condition) {
            throw new Error(message);
        }
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`${message}: expected ${expected}, got ${actual}`);
        }
    }

    assertDeepEqual(actual, expected, message) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    }
}

const test = new TestRunner();

// Test basic get/set operations
test.test('Basic get/set operations', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    // Test defaults
    test.assertEqual(settings.get('iobroker.url'), 'http://192.168.178.38:8082', 'Should get default iobroker.url');
    test.assertEqual(settings.get('dashboard.auto_save'), true, 'Should get default auto_save');
    
    // Test runtime settings
    await settings.set('test.key', 'test-value', false);
    test.assertEqual(settings.get('test.key'), 'test-value', 'Should get runtime setting');
    
    // Test persistent settings
    await settings.set('persistent.key', 'persistent-value', true);
    test.assertEqual(settings.get('persistent.key'), 'persistent-value', 'Should get persistent setting');
});

// Test dot notation parsing
test.test('Dot notation key parsing', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    // Test nested key setting
    await settings.set('theme.colors.primary', '#ff0000', false);
    test.assertEqual(settings.get('theme.colors.primary'), '#ff0000', 'Should handle nested dot notation');
    
    // Test prefix search
    const themeKeys = settings.getKeysWithPrefix('theme');
    test.assert(themeKeys.length > 0, 'Should find theme keys');
    test.assert(themeKeys.includes('theme.colors.primary'), 'Should include nested key in prefix search');
});

// Test value type parsing
test.test('Value type parsing', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    // Test boolean parsing
    await settings.set('test.bool_true', 'true', false);
    test.assertEqual(settings.get('test.bool_true'), true, 'Should parse "true" as boolean');
    
    await settings.set('test.bool_false', 'false', false);
    test.assertEqual(settings.get('test.bool_false'), false, 'Should parse "false" as boolean');
    
    // Test number parsing
    await settings.set('test.int', '42', false);
    test.assertEqual(settings.get('test.int'), 42, 'Should parse integer');
    
    await settings.set('test.float', '3.14', false);
    test.assertEqual(settings.get('test.float'), 3.14, 'Should parse float');
    
    // Test JSON parsing
    await settings.set('test.json', '{"key": "value"}', false);
    test.assertDeepEqual(settings.get('test.json'), { key: 'value' }, 'Should parse JSON object');
});

// Test theme application
test.test('Theme application', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    // Test built-in theme
    await settings.applyTheme('dark');
    test.assertEqual(settings.get('theme.name'), 'dark', 'Should set theme name');
    test.assertEqual(settings.get('theme.colors.primary'), '#50fa7b', 'Should set theme colors');
    
    // Test custom theme
    const customTheme = {
        name: 'custom',
        colors: {
            primary: '#123456',
            secondary: '#654321'
        }
    };
    
    await settings.applyTheme(customTheme);
    test.assertEqual(settings.get('theme.name'), 'custom', 'Should set custom theme name');
    test.assertEqual(settings.get('theme.colors.primary'), '#123456', 'Should set custom theme colors');
});

// Test environment variable conversion
test.test('Environment variable conversion', () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    // Test env key conversion
    const dotKey = settings.envKeyToDotNotation('IOBROKER_URL');
    test.assertEqual(dotKey, 'iobroker.url', 'Should convert env key to dot notation');
    
    const complexKey = settings.envKeyToDotNotation('THEME_COLORS_PRIMARY');
    test.assertEqual(complexKey, 'theme.colors.primary', 'Should handle complex env keys');
});

// Test validation
test.test('Settings validation', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    // Test valid settings
    let validation = settings.validate();
    test.assert(validation.isValid, 'Should be valid with defaults');
    
    // Test invalid URL
    await settings.set('iobroker.url', 'not-a-url', false);
    validation = settings.validate();
    test.assert(!validation.isValid, 'Should be invalid with bad URL');
    test.assert(validation.errors.some(e => e.includes('valid URL')), 'Should report URL error');
});

// Test export/import
test.test('Export/import configuration', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    // Set some test values
    await settings.set('export.test', 'value1', true);
    await settings.set('runtime.test', 'value2', false);
    
    // Export config
    const backup = settings.exportConfig();
    test.assert(backup.timestamp, 'Should have timestamp');
    test.assert(backup.persistent, 'Should have persistent config');
    test.assert(backup.runtime, 'Should have runtime config');
    
    // Clear and import
    await settings.reset(true);
    test.assertEqual(settings.get('export.test', 'missing'), 'missing', 'Should be cleared');
    
    await settings.importConfig(backup);
    test.assertEqual(settings.get('export.test'), 'value1', 'Should restore persistent setting');
    test.assertEqual(settings.get('runtime.test'), 'value2', 'Should restore runtime setting');
});

// Test priority order
test.test('Configuration priority order', async () => {
    const settings = new UnifiedSettingsManager({
        envFile: './test-env.tmp',
        settingsFile: './test-settings.tmp'
    });
    
    await settings.initialize();
    
    const testKey = 'priority.test';
    
    // Default < Env < Persistent < Runtime
    test.assertEqual(settings.get(testKey, 'default'), 'default', 'Should use default value');
    
    // Simulate env config (lower level)
    settings.envConfig.set(testKey, 'env-value');
    test.assertEqual(settings.get(testKey), 'env-value', 'Should prefer env over default');
    
    // Add persistent config (higher level)
    await settings.set(testKey, 'persistent-value', true);
    test.assertEqual(settings.get(testKey), 'persistent-value', 'Should prefer persistent over env');
    
    // Add runtime config (highest level)
    await settings.set(testKey, 'runtime-value', false);
    test.assertEqual(settings.get(testKey), 'runtime-value', 'Should prefer runtime over persistent');
});

// Cleanup and run tests
async function cleanup() {
    try {
        await fs.unlink('./test-env.tmp');
    } catch {}
    try {
        await fs.unlink('./test-settings.tmp');
    } catch {}
}

// Run tests
cleanup()
    .then(() => test.run())
    .then(() => cleanup())
    .catch(console.error);