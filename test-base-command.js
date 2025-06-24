#!/usr/bin/env node

/**
 * Test suite for updated BaseCommand with flag support
 * Run with: node test-base-command.js
 */

import { BaseCommand } from './commands/base-command.js';

// Mock dashboard for testing
const mockDashboard = {
    addSuccessMessage: (msg) => console.log(`✅ ${msg}`),
    addErrorMessage: (msg) => console.log(`❌ ${msg}`),
    addInfoMessage: (msg) => console.log(`ℹ️ ${msg}`),
    addWarningMessage: (msg) => console.log(`⚠️ ${msg}`)
};

// Test command implementation
class TestCommand extends BaseCommand {
    get name() {
        return 'test';
    }

    get aliases() {
        return ['t'];
    }

    get description() {
        return 'A test command for flag parsing';
    }

    get usage() {
        return 'test -g <group> [-n <name>] [-v]';
    }

    get flagSchema() {
        return {
            required: ['g'],
            knownFlags: ['g', 'n', 'v', 'h'],
            flags: {
                g: { type: 'string', description: 'Group name (required)' },
                n: { type: 'string', description: 'Optional name' },
                v: { type: 'boolean', description: 'Verbose mode' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            'test -g "Solar System"',
            'test -g "Temperatures" -n "Outdoor" -v'
        ];
    }

    async run(parsedArgs) {
        this.info(`Command executed with flags:`);
        this.info(`  Group: ${parsedArgs.getFlag('g')}`);
        this.info(`  Name: ${parsedArgs.getFlag('n', 'not specified')}`);
        this.info(`  Verbose: ${parsedArgs.getFlag('v', false)}`);
        
        if (parsedArgs.positional.length > 0) {
            this.info(`  Positional args: ${parsedArgs.positional.join(', ')}`);
        }
    }
}

async function runTests() {
    console.log('🧪 Testing Updated BaseCommand with Flag Support\n');
    
    const cmd = new TestCommand(mockDashboard);
    
    console.log('📋 Test 1: Help flag');
    await cmd.execute(['-h']);
    
    console.log('\n📋 Test 2: Valid command with required flag');
    await cmd.execute(['-g', 'Solar System']);
    
    console.log('\n📋 Test 3: Valid command with all flags');
    await cmd.execute(['-g', 'Temperatures', '-n', 'Outdoor', '-v']);
    
    console.log('\n📋 Test 4: Missing required flag (should show error)');
    await cmd.execute(['-v']);
    
    console.log('\n📋 Test 5: Unknown flag (should show warning)');
    await cmd.execute(['-g', 'Solar', '-x']);
    
    console.log('\n📋 Test 6: String argument parsing');
    await cmd.execute('-g "Solar System" -n "PV Power" -v');
    
    console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);