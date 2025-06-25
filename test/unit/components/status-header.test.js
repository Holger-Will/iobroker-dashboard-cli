import { expect } from 'chai';
import sinon from 'sinon';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import { StatusHeader } from '../../../status-header.js';

describe('StatusHeader', function() {
    let statusHeader;
    let mockDashboard;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        
        // Create mock dashboard
        mockDashboard = {
            client: {
                connected: true,
                connectionState: 'connected',
                url: 'http://192.168.178.38:8082',
                on: sinon.spy()
            },
            mcp: {
                connected: true,
                toolCount: 25
            },
            layout: {
                getLayout: sinon.stub().returns({
                    columns: 4,
                    totalHeight: 20,
                    needsScrolling: false
                })
            },
            groups: [
                { id: 'g1', title: 'Group 1', elements: [{ id: 'e1' }, { id: 'e2' }] },
                { id: 'g2', title: 'Group 2', elements: [{ id: 'e3' }] }
            ]
        };

        statusHeader = new StatusHeader({
            dashboard: mockDashboard,
            terminalWidth: 120
        });
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    // Helper to remove ANSI color codes for text matching
    function stripAnsi(text) {
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }

    describe('initialization', function() {
        it('should initialize with correct properties', function() {
            expect(statusHeader.dashboard).to.equal(mockDashboard);
            expect(statusHeader.terminalWidth).to.equal(120);
            expect(statusHeader.visible).to.be.true;
        });

        it('should have default configuration', function() {
            const defaultHeader = new StatusHeader({ dashboard: mockDashboard });
            
            expect(defaultHeader.terminalWidth).to.equal(80); // default
            expect(defaultHeader.visible).to.be.true;
            expect(defaultHeader.showTimestamp).to.be.true;
        });
    });

    describe('connection status display', function() {
        it('should show connected status for ioBroker', function() {
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('Connected');
            expect(rendered).to.include('192.168.178.38:8082');
            expect(rendered).to.include('✓'); // Connected indicator
        });

        it('should show disconnected status for ioBroker', function() {
            mockDashboard.client.connected = false;
            mockDashboard.client.connectionState = 'disconnected';
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('Disconnected');
            expect(rendered).to.include('✗'); // Disconnected indicator
        });

        it('should show reconnecting status', function() {
            mockDashboard.client.connected = false;
            mockDashboard.client.connectionState = 'reconnecting';
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('Reconnecting');
            expect(rendered).to.include('⟳'); // Reconnecting indicator
        });

        it('should show MCP connection status', function() {
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('MCP');
            expect(rendered).to.include('25 tools');
            expect(rendered).to.include('✓');
        });

        it('should show MCP disconnected status', function() {
            mockDashboard.mcp.connected = false;
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('MCP');
            expect(rendered).to.include('✗');
        });
    });

    describe('dashboard statistics', function() {
        it('should show correct group and element counts', function() {
            const rendered = statusHeader.render();
            
            // Remove ANSI color codes for text matching
            const cleanRendered = rendered.replace(/\x1b\[[0-9;]*m/g, '');
            
            expect(cleanRendered).to.include('2 groups'); // 2 groups in mock
            expect(cleanRendered).to.include('3 elements'); // Total elements across groups
        });

        it('should show layout configuration', function() {
            const rendered = statusHeader.render();
            
            // Remove ANSI color codes for text matching
            const cleanRendered = rendered.replace(/\x1b\[[0-9;]*m/g, '');
            
            expect(cleanRendered).to.include('4 cols'); // Column count
        });

        it('should indicate scrolling when needed', function() {
            mockDashboard.layout.getLayout.returns({
                columns: 4,
                totalHeight: 50,
                needsScrolling: true
            });
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('↕'); // Scroll indicator
        });

        it('should handle empty dashboard', function() {
            mockDashboard.groups = [];
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('0 groups');
            expect(rendered).to.include('0 elements');
        });
    });

    describe('timestamp display', function() {
        it('should show current timestamp when enabled', function() {
            statusHeader.showTimestamp = true;
            
            const rendered = statusHeader.render();
            
            // Should contain time in HH:MM format
            expect(rendered).to.match(/\d{2}:\d{2}/);
        });

        it('should not show timestamp when disabled', function() {
            statusHeader.showTimestamp = false;
            
            const rendered = statusHeader.render();
            
            // Should not contain time format
            expect(rendered).to.not.match(/\d{2}:\d{2}/);
        });

        it('should update timestamp on each render', function() {
            const clock = sinon.useFakeTimers(new Date('2025-01-01 14:30:00'));
            
            const rendered1 = statusHeader.render();
            expect(rendered1).to.include('14:30');
            
            clock.tick(60000); // Advance 1 minute
            
            const rendered2 = statusHeader.render();
            expect(rendered2).to.include('14:31');
            
            clock.restore();
        });
    });

    describe('responsive layout', function() {
        it('should adapt to narrow terminals', function() {
            statusHeader.terminalWidth = 60;
            
            const rendered = statusHeader.render();
            
            // Should still fit within terminal width
            const lines = rendered.split('\n');
            lines.forEach(line => {
                const visibleLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
                expect(visibleLength).to.be.at.most(60);
            });
        });

        it('should abbreviate labels for narrow displays', function() {
            statusHeader.terminalWidth = 50;
            
            const rendered = statusHeader.render();
            
            // Should use shorter labels
            expect(rendered).to.include('ioBr'); // Abbreviated ioBroker
        });

        it('should hide optional elements when very narrow', function() {
            statusHeader.terminalWidth = 30;
            
            const rendered = statusHeader.render();
            
            // Should prioritize connection status over other info
            expect(rendered).to.include('Connected');
            // Timestamp might be hidden in very narrow mode
        });
    });

    describe('theme integration', function() {
        it('should apply theme colors to status indicators', function() {
            const rendered = statusHeader.render();
            
            // Should contain ANSI color codes
            expect(rendered).to.match(/\x1b\[[0-9;]*m/);
        });

        it('should use success colors for connected status', function() {
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('✓'); // Connected symbol should be colored
        });

        it('should use error colors for disconnected status', function() {
            mockDashboard.client.connected = false;
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.include('✗'); // Disconnected symbol should be colored
        });
    });

    describe('visibility control', function() {
        it('should return empty string when hidden', function() {
            statusHeader.setVisible(false);
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.equal('');
        });

        it('should render normally when visible', function() {
            statusHeader.setVisible(true);
            
            const rendered = statusHeader.render();
            
            expect(rendered).to.not.equal('');
            expect(rendered).to.include('Connected');
        });

        it('should toggle visibility', function() {
            statusHeader.setVisible(false);
            expect(statusHeader.visible).to.be.false;
            
            statusHeader.toggle();
            expect(statusHeader.visible).to.be.true;
            
            statusHeader.toggle();
            expect(statusHeader.visible).to.be.false;
        });
    });

    describe('real-time updates', function() {
        it('should update connection status when dashboard state changes', function() {
            const rendered1 = statusHeader.render();
            expect(rendered1).to.include('Connected');
            
            // Simulate connection loss
            mockDashboard.client.connected = false;
            mockDashboard.client.connectionState = 'disconnected';
            
            const rendered2 = statusHeader.render();
            expect(rendered2).to.include('Disconnected');
        });

        it('should update statistics when dashboard content changes', function() {
            const rendered1 = statusHeader.render();
            expect(rendered1).to.include('2 groups');
            
            // Add another group
            mockDashboard.groups.push({ 
                id: 'g3', 
                title: 'Group 3', 
                elements: [{ id: 'e4' }, { id: 'e5' }] 
            });
            
            const rendered2 = statusHeader.render();
            expect(rendered2).to.include('3 groups');
            expect(rendered2).to.include('5 elements');
        });
    });

    describe('terminal width updates', function() {
        it('should update terminal width and adjust layout', function() {
            statusHeader.updateTerminalWidth(100);
            
            expect(statusHeader.terminalWidth).to.equal(100);
            
            const rendered = statusHeader.render();
            const lines = rendered.split('\n');
            lines.forEach(line => {
                const visibleLength = line.replace(/\x1b\[[0-9;]*m/g, '').length;
                expect(visibleLength).to.be.at.most(100);
            });
        });
    });
});