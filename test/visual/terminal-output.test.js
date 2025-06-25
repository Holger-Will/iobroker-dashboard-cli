import { expect } from 'chai';
import { spawn } from 'child_process';
import stripAnsi from 'strip-ansi';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Terminal Output Regression Tests', function() {
    this.timeout(30000);

    const outputDir = path.join(__dirname, 'outputs');
    const baselineDir = path.join(outputDir, 'baseline');
    const actualDir = path.join(outputDir, 'actual');

    before(async function() {
        await fs.mkdir(outputDir, { recursive: true });
        await fs.mkdir(baselineDir, { recursive: true });
        await fs.mkdir(actualDir, { recursive: true });
    });

    describe('Basic Application States', function() {
        it('should show consistent help command output', async function() {
            const output = await captureOutput('help-command', {
                setup: () => setupTestDashboard(),
                inputs: ['/help\n'],
                timeout: 5000
            });

            await validateOutput('help-command', output);
        });

        it('should show theme list consistently', async function() {
            const output = await captureOutput('theme-list', {
                setup: () => setupTestDashboard(),
                inputs: ['/theme -l\n'],
                timeout: 3000
            });

            await validateOutput('theme-list', output);
        });
    });

    // Helper function to capture terminal output
    async function captureOutput(testName, options) {
        const { setup, inputs = [], timeout = 5000 } = options;

        // Run setup
        if (setup) {
            await setup();
        }

        return new Promise((resolve, reject) => {
            const child = spawn('node', ['index.js'], {
                cwd: path.join(__dirname, '../..'),
                stdio: ['pipe', 'pipe', 'pipe'],
                env: {
                    ...process.env,
                    // Force consistent terminal size
                    COLUMNS: '120',
                    LINES: '30',
                    TERM: 'xterm-256color',
                    // Disable animations and delays for testing
                    NODE_ENV: 'test'
                }
            });

            let output = '';
            let inputIndex = 0;

            child.stdout.on('data', (data) => {
                output += data.toString();
            });

            child.stderr.on('data', (data) => {
                output += data.toString();
            });

            // Send inputs with delays
            const sendNextInput = () => {
                if (inputIndex < inputs.length) {
                    const input = inputs[inputIndex++];
                    setTimeout(() => {
                        child.stdin.write(input);
                        sendNextInput();
                    }, 800); // 800ms delay between inputs
                }
            };

            // Start sending inputs after initial delay
            setTimeout(sendNextInput, 2000);

            // Timeout handling
            const timer = setTimeout(() => {
                child.kill();
                resolve(normalizeOutput(output));
            }, timeout);

            child.on('close', () => {
                clearTimeout(timer);
                resolve(normalizeOutput(output));
            });

            child.on('error', (error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    // Normalize output for consistent comparison
    function normalizeOutput(output) {
        return output
            // Remove ANSI codes for text-based comparison
            .split('\n')
            .map(line => stripAnsi(line))
            // Remove timestamp variations
            .map(line => line.replace(/\d{2}:\d{2}:\d{2}/g, 'HH:MM:SS'))
            // Remove date variations
            .map(line => line.replace(/\w+ \d+ \w+ \d{4}/g, 'Day DD Mon YYYY'))
            // Remove process-specific data
            .map(line => line.replace(/PID: \d+/g, 'PID: XXXX'))
            // Normalize file paths
            .map(line => line.replace(/\/.*?\.iobroker-dashboard-cli/g, '~/.iobroker-dashboard-cli'))
            // Remove variable connection messages
            .map(line => line.replace(/\[CONNECT\].*/, '[CONNECT] Connecting...'))
            .map(line => line.replace(/\[SUCCESS\].*/, '[SUCCESS] Connected'))
            // Remove empty lines at start/end
            .join('\n')
            .trim();
    }

    // Validate output against baseline
    async function validateOutput(testName, actualOutput) {
        const actualPath = path.join(actualDir, `${testName}.txt`);
        const baselinePath = path.join(baselineDir, `${testName}.txt`);

        // Save actual output
        await fs.writeFile(actualPath, actualOutput);

        // Check if baseline exists
        const baselineExists = await fs.access(baselinePath).then(() => true).catch(() => false);

        if (baselineExists) {
            const baselineOutput = await fs.readFile(baselinePath, 'utf8');
            
            if (actualOutput !== baselineOutput) {
                // Show diff in test output
                console.log(`\nRegression detected in ${testName}:`);
                console.log('Expected (baseline):');
                console.log(baselineOutput.substring(0, 500) + '...');
                console.log('\nActual:');
                console.log(actualOutput.substring(0, 500) + '...');
                
                throw new Error(`Terminal output regression in ${testName}. Check ${actualPath} vs ${baselinePath}`);
            }
        } else {
            // Create new baseline
            await fs.writeFile(baselinePath, actualOutput);
            console.log(`Created new baseline: ${testName}.txt`);
        }
    }

    // Setup helper functions
    async function setupTestDashboard() {
        await setupUserDataDirectory();
        await createTestDashboard('default.json', {
            version: "1.0.0",
            name: "Test Dashboard",
            layout: { columns: 4, padding: 1, rowSpacing: 1, showBorders: true },
            groups: [{
                id: "test-group",
                title: "Test Group",
                elements: [
                    { 
                        id: "test-gauge", 
                        type: "gauge", 
                        caption: "Test Gauge", 
                        stateId: "test.state", 
                        unit: "W" 
                    }
                ]
            }]
        });
    }

    async function setupUserDataDirectory() {
        const os = await import('os');
        const userDataDir = path.join(os.homedir(), '.iobroker-dashboard-cli');
        const configDir = path.join(userDataDir, 'dashboard-configs');
        
        await fs.mkdir(userDataDir, { recursive: true });
        await fs.mkdir(configDir, { recursive: true });
    }

    async function createTestDashboard(filename, config) {
        const os = await import('os');
        const configDir = path.join(os.homedir(), '.iobroker-dashboard-cli', 'dashboard-configs');
        const configPath = path.join(configDir, filename);
        
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    }
});