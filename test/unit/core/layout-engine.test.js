import { expect } from 'chai';
import sinon from 'sinon';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import LayoutEngine from '../../../layout-engine.js';
import { UnifiedSettingsManager } from '../../../unified-settings-manager.js';
import path from 'path';

describe('LayoutEngine', function() {
    let layoutEngine;
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

        // Create layout engine with settings integration
        layoutEngine = new LayoutEngine({
            settings: settingsManager,
            terminalWidth: 120,
            terminalHeight: 30
        });
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('column-based layout configuration', function() {
        it('should use settings for column count', function() {
            // Set 4 columns in settings
            settingsManager.set('layout.columns', 4);
            
            const layout = layoutEngine.calculateLayout();
            
            expect(layout.columns).to.equal(4);
        });

        it('should use settings for padding between columns', function() {
            // Set padding to 2
            settingsManager.set('layout.padding', 2);
            
            const layout = layoutEngine.calculateLayout();
            
            // Verify that groups are spaced with 2-char padding
            const groups = layout.groups;
            if (groups.length >= 2) {
                const group1 = groups.find(g => g.column === 0);
                const group2 = groups.find(g => g.column === 1);
                if (group1 && group2) {
                    const expectedSpacing = group1.width + 2;
                    expect(group2.x - group1.x).to.equal(expectedSpacing);
                }
            }
        });

        it('should calculate dynamic group width based on columns and terminal width', function() {
            // Terminal width 120, 4 columns, 1 padding
            settingsManager.set('layout.columns', 4);
            settingsManager.set('layout.padding', 1);
            
            // Add a group to test width calculation
            layoutEngine.addGroup({ id: 'test', title: 'Test Group', elements: [{ id: 'e1' }] });
            
            const layout = layoutEngine.calculateLayout();
            
            // Available width = 120
            // Total padding = (4 - 1) * 1 = 3
            // Group width = (120 - 3) / 4 = 29.25 → 29
            const expectedGroupWidth = Math.floor((120 - 3) / 4);
            
            expect(layout.groups[0]?.width).to.equal(expectedGroupWidth);
        });

        it('should handle responsive behavior when terminal is too narrow', function() {
            // Narrow terminal
            layoutEngine.updateTerminalSize(60, 30);
            settingsManager.set('layout.columns', 6);
            
            // Add a group to test width
            layoutEngine.addGroup({ id: 'test', title: 'Test Group', elements: [{ id: 'e1' }] });
            
            const layout = layoutEngine.calculateLayout();
            
            // Should automatically reduce columns when groups would be too narrow
            // Minimum group width should be respected
            const groupWidth = layout.groups[0]?.width || 0;
            expect(groupWidth).to.be.at.least(15); // Minimum reasonable width
        });

        it('should apply row spacing from settings', function() {
            settingsManager.set('layout.rowSpacing', 2);
            
            // Add multiple groups to test spacing
            layoutEngine.addGroup({ id: 'g1', title: 'Group 1', elements: [{ id: 'e1' }] });
            layoutEngine.addGroup({ id: 'g2', title: 'Group 2', elements: [{ id: 'e2' }] });
            
            const layout = layoutEngine.calculateLayout();
            
            // When groups are in same column, they should have 2-line spacing
            const sameColumnGroups = layout.groups.filter(g => g.column === 0);
            if (sameColumnGroups.length >= 2) {
                const firstGroup = sameColumnGroups[0];
                const secondGroup = sameColumnGroups[1];
                const actualSpacing = secondGroup.y - (firstGroup.y + firstGroup.height);
                expect(actualSpacing).to.equal(2);
            }
        });

        it('should show/hide borders based on settings', function() {
            settingsManager.set('layout.showBorders', true);
            
            layoutEngine.addGroup({ id: 'g1', title: 'Test Group', elements: [{ id: 'e1' }] });
            
            const layout = layoutEngine.calculateLayout();
            const group = layout.groups[0];
            
            // With borders, group height should include border lines
            // 1 element + 2 border lines = 3 minimum height
            expect(group.height).to.be.at.least(3);
            
            // Test without borders
            settingsManager.set('layout.showBorders', false);
            const layoutNoBorders = layoutEngine.calculateLayout();
            const groupNoBorders = layoutNoBorders.groups[0];
            
            // Without borders, height should be smaller
            expect(groupNoBorders.height).to.be.lessThan(group.height);
        });
    });

    describe('layout calculations', function() {
        it('should distribute groups evenly across columns', function() {
            settingsManager.set('layout.columns', 3);
            
            // Add 6 groups
            for (let i = 1; i <= 6; i++) {
                layoutEngine.addGroup({ 
                    id: `g${i}`, 
                    title: `Group ${i}`, 
                    elements: [{ id: `e${i}` }] 
                });
            }
            
            const layout = layoutEngine.calculateLayout();
            
            // Should have groups in each column
            const columnCounts = [0, 1, 2].map(col => 
                layout.groups.filter(g => g.column === col).length
            );
            
            // Each column should have 2 groups (6 groups / 3 columns)
            expect(columnCounts).to.deep.equal([2, 2, 2]);
        });

        it('should place groups in shortest column (masonry layout)', function() {
            settingsManager.set('layout.columns', 2);
            
            // Add groups with different heights
            layoutEngine.addGroup({ 
                id: 'tall', 
                title: 'Tall Group', 
                elements: [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }] 
            });
            layoutEngine.addGroup({ 
                id: 'short1', 
                title: 'Short Group 1', 
                elements: [{ id: 'e4' }] 
            });
            layoutEngine.addGroup({ 
                id: 'short2', 
                title: 'Short Group 2', 
                elements: [{ id: 'e5' }] 
            });
            
            const layout = layoutEngine.calculateLayout();
            
            // First group goes to column 0
            const tallGroup = layout.groups.find(g => g.id === 'tall');
            expect(tallGroup.column).to.equal(0);
            
            // Next two groups should go to column 1 (shorter)
            const short1 = layout.groups.find(g => g.id === 'short1');
            const short2 = layout.groups.find(g => g.id === 'short2');
            expect(short1.column).to.equal(1);
            expect(short2.column).to.equal(1);
        });
    });

    describe('settings integration', function() {
        it('should recalculate layout when settings change', function() {
            const layoutChangedSpy = sinon.spy();
            layoutEngine.on('layout-changed', layoutChangedSpy);
            
            layoutEngine.addGroup({ id: 'g1', title: 'Test', elements: [{ id: 'e1' }] });
            
            // Change column count
            settingsManager.set('layout.columns', 6);
            layoutEngine.applySettings(); // Method to apply new settings
            
            expect(layoutChangedSpy).to.have.been.called;
            const layout = layoutEngine.getLayout();
            expect(layout.columns).to.equal(6);
        });

        it('should validate minimum group width', function() {
            // Very narrow terminal with many columns should be limited
            layoutEngine.updateTerminalSize(80, 30);
            settingsManager.set('layout.columns', 8);
            
            // Add a group to test width
            layoutEngine.addGroup({ id: 'test', title: 'Test Group', elements: [{ id: 'e1' }] });
            
            const layout = layoutEngine.calculateLayout();
            
            // Should automatically reduce columns to maintain minimum width
            const groupWidth = layout.groups[0]?.width || 0;
            expect(groupWidth).to.be.at.least(15);
        });
    });

    describe('responsive behavior', function() {
        it('should reduce columns on very narrow terminals', function() {
            settingsManager.set('layout.columns', 4);
            
            // Very narrow terminal
            layoutEngine.updateTerminalSize(50, 30);
            
            const layout = layoutEngine.calculateLayout();
            
            // Should use fewer columns than requested
            expect(layout.columns).to.be.lessThan(4);
        });

        it('should emit resize events when terminal changes', function() {
            const resizeSpy = sinon.spy();
            layoutEngine.on('resize', resizeSpy);
            
            layoutEngine.updateTerminalSize(100, 25);
            
            expect(resizeSpy).to.have.been.called;
        });
    });
});