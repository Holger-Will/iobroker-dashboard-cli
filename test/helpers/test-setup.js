// Global test setup
import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

// Configure Chai to use Sinon-Chai
use(sinonChai);
import tmp from 'tmp';
import path from 'path';
import fs from 'fs/promises';

// Make chai available globally
global.expect = expect;
global.sinon = sinon;

// Test data directory setup
export const TEST_DATA_DIR = tmp.dirSync({ unsafeCleanup: true }).name;

// Clean up test directories after each test
afterEach(async function() {
    sinon.restore();
});

// Helper to create temporary test directories
export async function createTestUserDataDir() {
    const testDir = path.join(TEST_DATA_DIR, `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'dashboard-configs'), { recursive: true });
    return testDir;
}

// Helper to clean up test directories
export async function cleanupTestDir(dir) {
    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
        // Ignore cleanup errors
    }
}