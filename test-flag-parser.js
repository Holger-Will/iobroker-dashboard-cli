#!/usr/bin/env node

/**
 * Test suite for CommandFlagParser
 * Run with: node test-flag-parser.js
 */

import { CommandFlagParser } from './command-flag-parser.js';

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
        console.log('🧪 Running CommandFlagParser Tests\n');

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

// Test basic command parsing
test.test('Parse simple command', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/add');
    
    test.assertEqual(result.command, '/add', 'Command should be /add');
    test.assertEqual(Object.keys(result.flags).length, 0, 'Should have no flags');
    test.assertEqual(result.positional.length, 0, 'Should have no positional args');
    test.assertEqual(result.hasErrors, false, 'Should have no errors');
});

// Test flags without values
test.test('Parse boolean flags', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/ls -g -c');
    
    test.assertEqual(result.command, '/ls', 'Command should be /ls');
    test.assertEqual(result.getFlag('g'), true, 'Flag g should be true');
    test.assertEqual(result.getFlag('c'), true, 'Flag c should be true');
    test.assert(result.hasFlag('g'), 'Should have flag g');
    test.assert(result.hasFlag('c'), 'Should have flag c');
});

// Test flags with values
test.test('Parse flags with values', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/add -g "Solar System" -n "PV Power" -t gauge');
    
    test.assertEqual(result.command, '/add', 'Command should be /add');
    test.assertEqual(result.getFlag('g'), 'Solar System', 'Flag g should be "Solar System"');
    test.assertEqual(result.getFlag('n'), 'PV Power', 'Flag n should be "PV Power"');
    test.assertEqual(result.getFlag('t'), 'gauge', 'Flag t should be gauge');
});

// Test quoted arguments with spaces
test.test('Parse quoted arguments', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/rename -o "Old Name With Spaces" -n "New Name"');
    
    test.assertEqual(result.getFlag('o'), 'Old Name With Spaces', 'Should handle spaces in quotes');
    test.assertEqual(result.getFlag('n'), 'New Name', 'Should handle quoted new name');
});

// Test type inference
test.test('Parse typed values', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/set -n theme.auto_save -v true -p 42 -f 3.14');
    
    test.assertEqual(result.getFlag('v'), true, 'Should parse "true" as boolean');
    test.assertEqual(result.getFlag('p'), 42, 'Should parse "42" as integer');
    test.assertEqual(result.getFlag('f'), 3.14, 'Should parse "3.14" as float');
});

// Test JSON parsing
test.test('Parse JSON values', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/test -p \'{"id": "test.state", "value": true}\'');
    
    const jsonValue = result.getFlag('p');
    test.assert(typeof jsonValue === 'object', 'Should parse JSON object');
    test.assertEqual(jsonValue.id, 'test.state', 'JSON should have correct id');
    test.assertEqual(jsonValue.value, true, 'JSON should have correct value');
});

// Test URL parsing
test.test('Parse URL values', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/set -n iobroker.url -v http://192.168.1.100:8082');
    
    const urlValue = result.getFlag('v');
    test.assert(urlValue instanceof URL, 'Should parse URL');
    test.assertEqual(urlValue.hostname, '192.168.1.100', 'URL should have correct hostname');
});

// Test mixed flags and positional args
test.test('Parse mixed arguments', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/help add -v');
    
    test.assertEqual(result.command, '/help', 'Command should be /help');
    test.assertEqual(result.getPositional(0), 'add', 'First positional should be "add"');
    test.assertEqual(result.getFlag('v'), true, 'Flag v should be true');
});

// Test error handling
test.test('Handle unclosed quotes', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/add -g "Unclosed quote');
    
    test.assert(result.hasErrors, 'Should have errors');
    test.assert(result.errors.some(e => e.includes('Unclosed quote')), 'Should report unclosed quote');
});

// Test empty commands
test.test('Handle empty commands', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('');
    
    test.assert(result.hasErrors, 'Should have errors for empty command');
});

// Test validation schema
test.test('Validate with schema', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/add -g "Solar" -s test.state');
    
    const schema = {
        required: ['g', 's'],
        knownFlags: ['g', 's', 'n', 't', 'i'],
        flags: {
            g: { type: 'string', description: 'Group name' },
            s: { type: 'string', description: 'State ID' },
            t: { type: 'string', enum: ['gauge', 'switch', 'indicator'] }
        }
    };
    
    const validation = CommandFlagParser.validate(result, schema);
    test.assert(validation.isValid, 'Should be valid with required flags');
    test.assertEqual(validation.errors.length, 0, 'Should have no validation errors');
});

// Test validation failures
test.test('Fail validation with missing required', () => {
    const parser = new CommandFlagParser();
    const result = parser.parse('/add -g "Solar"');
    
    const schema = {
        required: ['g', 's'],
        flags: {
            g: { type: 'string' },
            s: { type: 'string' }
        }
    };
    
    const validation = CommandFlagParser.validate(result, schema);
    test.assert(!validation.isValid, 'Should be invalid');
    test.assert(validation.errors.some(e => e.includes('Required flag missing: -s')), 'Should report missing required flag');
});

// Test help formatting
test.test('Format help text', () => {
    const schema = {
        usage: '/add [flags]',
        description: 'Add elements or groups to dashboard',
        required: ['g'],
        flags: {
            g: { type: 'string', description: 'Group name' },
            t: { type: 'string', enum: ['gauge', 'switch'], description: 'Element type' }
        },
        examples: ['/add -g "Solar" -s test.state']
    };
    
    const help = CommandFlagParser.formatHelp(schema);
    test.assert(help.includes('Usage:'), 'Help should include usage');
    test.assert(help.includes('Add elements'), 'Help should include description');
    test.assert(help.includes('-g'), 'Help should include flag g');
    test.assert(help.includes('required'), 'Help should mark required flags');
    test.assert(help.includes('Examples:'), 'Help should include examples');
});

// Run all tests
test.run().catch(console.error);