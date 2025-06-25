import { expect } from 'chai';
import sinon from 'sinon';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import { UnifiedSettingsManager } from '../../../unified-settings-manager.js';
import path from 'path';

import { SetCommand } from '../../../commands/set-command.js';

describe('SetCommand', function() {
    let setCommand;
    let mockDashboard;
    let settingsManager;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        
        // Create real settings manager for integration testing
        settingsManager = new UnifiedSettingsManager({
            settingsFile: path.join(testDataDir, 'settings.json'),
            configDir: path.join(testDataDir, 'dashboard-configs')
        });
        await settingsManager.initialize();

        mockDashboard = {
            addMessage: sinon.spy(),
            addErrorMessage: sinon.spy(),
            addSuccessMessage: sinon.spy(),
            addInfoMessage: sinon.spy(),
            addWarningMessage: sinon.spy(),
            renderDashboard: sinon.spy(),
            settings: settingsManager,
            layout: {
                setColumns: sinon.spy(),
                setPadding: sinon.spy(),
                setRowSpacing: sinon.spy()
            }
        };

        setCommand = new SetCommand(mockDashboard);
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('command metadata', function() {
        it('should have correct name and aliases', function() {
            expect(setCommand.name).to.equal('set');
            expect(setCommand.aliases).to.include('config');
            expect(setCommand.description).to.include('configuration');
        });
    });

    describe('dot notation configuration', function() {
        it('should set layout.columns with validation', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '6'])
            };

            await setCommand.run(parsedArgs);

            // Should set the value
            expect(settingsManager.get('layout.columns')).to.equal(6);
            
            // Should show success message
            expect(mockDashboard.addSuccessMessage).to.have.been.calledWith(
                sinon.match(/layout\.columns.*6/)
            );
        });

        it('should validate column range (1-8)', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '0'])
            };

            await setCommand.run(parsedArgs);

            // Should show error for invalid value
            expect(mockDashboard.addErrorMessage).to.have.been.calledWith(
                sinon.match(/Columns must be between 1 and 8/)
            );
            
            // Should not change the setting
            expect(settingsManager.get('layout.columns')).to.equal(4); // default
        });

        it.skip('should warn for narrow group widths', async function() {
            // Mock narrow terminal
            const originalColumns = process.stdout.columns;
            process.stdout.columns = 100;

            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '8'])
            };

            await setCommand.run(parsedArgs);

            // Should show warning about narrow groups
            expect(mockDashboard.addWarningMessage).to.have.been.calledWith(
                sinon.match(/WARNING.*narrow/)
            );

            // Restore original
            process.stdout.columns = originalColumns;
        });
    });

    describe('list functionality', function() {
        it.skip('should list all settings with -l flag', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().callsFake(flag => flag === 'l'),
                getPositionalArgs: sinon.stub().returns([])
            };

            await setCommand.run(parsedArgs);

            // Should show layout settings
            expect(mockDashboard.addInfoMessage).to.have.been.calledWith(
                sinon.match(/layout\.columns.*4/)
            );
            expect(mockDashboard.addInfoMessage).to.have.been.calledWith(
                sinon.match(/layout\.padding.*1/)
            );
        });

        it.skip('should show single setting value when no value provided', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns'])
            };

            await setCommand.run(parsedArgs);

            // Should show current value
            expect(mockDashboard.addInfoMessage).to.have.been.calledWith(
                sinon.match(/layout\.columns.*4/)
            );
        });
    });

    describe('side effects', function() {
        it.skip('should trigger layout update for layout changes', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['layout.columns', '3'])
            };

            await setCommand.run(parsedArgs);

            // Should trigger layout engine update
            expect(mockDashboard.layout.setColumns).to.have.been.calledWith(3);
            
            // Should trigger dashboard re-render
            expect(mockDashboard.renderDashboard).to.have.been.called;
        });

        it.skip('should not trigger layout update for non-layout changes', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().returns(false),
                getPositionalArgs: sinon.stub().returns(['theme.name', 'dark'])
            };

            await setCommand.run(parsedArgs);

            // Should not trigger layout engine update
            expect(mockDashboard.layout.setColumns).to.not.have.been.called;
            expect(mockDashboard.renderDashboard).to.not.have.been.called;
        });
    });

    describe('help functionality', function() {
        it.skip('should show help with -h flag', async function() {
            const parsedArgs = {
                hasFlag: sinon.stub().callsFake(flag => flag === 'h'),
                getPositionalArgs: sinon.stub().returns([])
            };

            await setCommand.run(parsedArgs);

            // Should show usage examples
            expect(mockDashboard.addInfoMessage).to.have.been.calledWith(
                sinon.match(/\/set layout\.columns 4/)
            );
        });
    });
});