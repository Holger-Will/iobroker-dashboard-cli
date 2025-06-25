import { expect } from 'chai';
import sinon from 'sinon';
import { UnifiedSettingsManager } from '../../../unified-settings-manager.js';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import path from 'path';

describe('UnifiedSettingsManager', function() {
    let settingsManager;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        settingsManager = new UnifiedSettingsManager({
            settingsFile: path.join(testDataDir, 'settings.json'),
            configDir: path.join(testDataDir, 'dashboard-configs')
        });
        await settingsManager.initialize();
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('initialization', function() {
        it('should create user data directory structure', async function() {
            const fs = await import('fs/promises');
            
            // Check base directory exists
            const stats = await fs.stat(testDataDir);
            expect(stats.isDirectory()).to.be.true;
            
            // Check subdirectories exist
            const configStats = await fs.stat(path.join(testDataDir, 'dashboard-configs'));
            expect(configStats.isDirectory()).to.be.true;
        });

        it('should load default settings', function() {
            expect(settingsManager.get('layout.columns')).to.equal(4);
            expect(settingsManager.get('layout.padding')).to.equal(1);
            expect(settingsManager.get('layout.responsive')).to.be.true;
        });
    });

    describe('settings management', function() {
        it('should set and get values with dot notation', async function() {
            await settingsManager.set('layout.columns', 6);
            expect(settingsManager.get('layout.columns')).to.equal(6);
        });

        it('should persist settings to file', async function() {
            await settingsManager.set('layout.columns', 3);
            
            // Create new instance and verify persistence
            const newManager = new UnifiedSettingsManager({
                settingsFile: path.join(testDataDir, 'settings.json'),
                configDir: path.join(testDataDir, 'dashboard-configs')
            });
            await newManager.initialize();
            
            expect(newManager.get('layout.columns')).to.equal(3);
        });

        it('should emit events on changes', function(done) {
            settingsManager.on('changed', (event) => {
                expect(event.key).to.equal('layout.columns');
                expect(event.newValue).to.equal(5);
                done();
            });
            
            settingsManager.set('layout.columns', 5);
        });
    });

    describe('column layout settings', function() {
        it('should have correct default column layout values', function() {
            expect(settingsManager.get('layout.columns')).to.equal(4);
            expect(settingsManager.get('layout.padding')).to.equal(1);
            expect(settingsManager.get('layout.rowSpacing')).to.equal(1);
            expect(settingsManager.get('layout.showBorders')).to.be.true;
            expect(settingsManager.get('layout.responsive')).to.be.true;
            expect(settingsManager.get('layout.minGroupWidth')).to.equal(45);
        });
    });
});