import { expect } from 'chai';
import sinon from 'sinon';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';
import { LocalToolRegistry } from '../../../local-tools.js';

describe('LocalToolRegistry', function() {
    let localTools;
    let mockDashboard;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        
        // Create mock dashboard with tools
        mockDashboard = {
            tools: {
                addGroup: sinon.stub().resolves({ success: true, group: { id: 'g1', title: 'Test Group' } }),
                addElement: sinon.stub().resolves({ success: true, element: { id: 'e1', type: 'gauge' } }),
                listGroups: sinon.stub().returns([
                    { id: 'g1', title: 'Group 1', elements: [] },
                    { id: 'g2', title: 'Group 2', elements: [] }
                ]),
                removeElement: sinon.stub().resolves({ success: true }),
                moveGroup: sinon.stub().resolves({ success: true }),
                saveConfig: sinon.stub().resolves({ success: true, filename: 'test.json' }),
                loadConfig: sinon.stub().resolves({ success: true, config: {} })
            },
            configManager: {
                list: sinon.stub().resolves(['default.json', 'test.json']),
                getCurrentStatus: sinon.stub().returns({
                    groupCount: 2,
                    elementCount: 5,
                    currentConfig: 'default.json'
                })
            },
            layout: {
                getLayout: sinon.stub().returns({
                    columns: 4,
                    totalHeight: 20,
                    needsScrolling: false
                })
            }
        };

        localTools = new LocalToolRegistry(mockDashboard);
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('initialization', function() {
        it('should register all local tools', function() {
            const schemas = localTools.getToolSchemas();
            
            expect(schemas).to.be.an('array');
            expect(schemas.length).to.be.greaterThan(0);
            
            // Check for expected tools
            const toolNames = schemas.map(s => s.name);
            expect(toolNames).to.include('add_dashboard_element');
            expect(toolNames).to.include('create_dashboard_group');
            expect(toolNames).to.include('save_dashboard');
            expect(toolNames).to.include('load_dashboard');
            expect(toolNames).to.include('list_dashboard_configs');
        });

        it('should have valid tool schemas', function() {
            const schemas = localTools.getToolSchemas();
            
            schemas.forEach(schema => {
                expect(schema).to.have.property('name');
                expect(schema).to.have.property('description');
                expect(schema).to.have.property('input_schema');
                expect(schema.input_schema).to.have.property('type', 'object');
                expect(schema.input_schema).to.have.property('properties');
                expect(schema.input_schema).to.have.property('required');
            });
        });
    });

    describe('add_dashboard_element tool', function() {
        it('should add element to existing group', async function() {
            const input = {
                group: 'Group 1',
                type: 'gauge',
                caption: 'Temperature',
                stateId: 'sensor.temp',
                unit: '°C'
            };

            const result = await localTools.callTool('add_dashboard_element', input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Added gauge element "Temperature" to group "Group 1"');
            expect(mockDashboard.tools.addElement).to.have.been.calledWith(
                'g1', // Found group ID
                sinon.match({
                    type: 'gauge',
                    caption: 'Temperature',
                    stateId: 'sensor.temp',
                    unit: '°C'
                })
            );
        });

        it('should create new group when group does not exist', async function() {
            const input = {
                group: 'New Group',
                type: 'switch',
                caption: 'Light',
                stateId: 'switch.light'
            };

            mockDashboard.tools.listGroups.returns([]); // No existing groups

            const result = await localTools.callTool('add_dashboard_element', input);

            expect(result.success).to.be.true;
            expect(mockDashboard.tools.addGroup).to.have.been.calledWith('New Group');
            expect(mockDashboard.tools.addElement).to.have.been.called;
        });

        it('should validate required parameters', async function() {
            const input = {
                group: 'Test Group',
                type: 'gauge'
                // Missing caption and stateId
            };

            const result = await localTools.callTool('add_dashboard_element', input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('Missing required field');
        });

        it('should handle numeric min/max values', async function() {
            const input = {
                group: 'Group 1',
                type: 'gauge',
                caption: 'Pressure',
                stateId: 'sensor.pressure',
                min: 0,
                max: 100,
                unit: 'bar'
            };

            const result = await localTools.callTool('add_dashboard_element', input);

            expect(result.success).to.be.true;
            expect(mockDashboard.tools.addElement).to.have.been.calledWith(
                sinon.match.string,
                sinon.match({
                    min: 0,
                    max: 100
                })
            );
        });
    });

    describe('create_dashboard_group tool', function() {
        it('should create new group', async function() {
            const input = {
                title: 'Living Room'
            };

            const result = await localTools.callTool('create_dashboard_group', input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Created group "Living Room"');
            expect(mockDashboard.tools.addGroup).to.have.been.calledWith('Living Room');
        });

        it('should handle group creation failure', async function() {
            mockDashboard.tools.addGroup.resolves({ success: false, error: 'Group already exists' });

            const input = {
                title: 'Duplicate Group'
            };

            const result = await localTools.callTool('create_dashboard_group', input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('Failed to create group');
        });
    });

    describe('save_dashboard tool', function() {
        it('should save dashboard with default filename', async function() {
            const input = {};

            const result = await localTools.callTool('save_dashboard', input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Saved dashboard');
            expect(mockDashboard.tools.saveConfig).to.have.been.called;
        });

        it('should save dashboard with custom filename', async function() {
            const input = {
                filename: 'my-config.json',
                name: 'My Custom Dashboard'
            };

            const result = await localTools.callTool('save_dashboard', input);

            expect(result.success).to.be.true;
            expect(mockDashboard.tools.saveConfig).to.have.been.calledWith(
                'my-config.json',
                sinon.match({ name: 'My Custom Dashboard' })
            );
        });
    });

    describe('load_dashboard tool', function() {
        it('should load specified dashboard', async function() {
            const input = {
                filename: 'test.json'
            };

            const result = await localTools.callTool('load_dashboard', input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Loaded dashboard');
            expect(mockDashboard.tools.loadConfig).to.have.been.calledWith('test.json');
        });

        it('should handle load failure', async function() {
            mockDashboard.tools.loadConfig.resolves({ success: false, error: 'File not found' });

            const input = {
                filename: 'nonexistent.json'
            };

            const result = await localTools.callTool('load_dashboard', input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('Failed to load dashboard');
        });
    });

    describe('list_dashboard_configs tool', function() {
        it('should list available configurations', async function() {
            const result = await localTools.callTool('list_dashboard_configs', {});

            expect(result.success).to.be.true;
            expect(result.result.configs).to.deep.equal(['default.json', 'test.json']);
            expect(mockDashboard.configManager.list).to.have.been.called;
        });
    });

    describe('get_dashboard_status tool', function() {
        it('should return dashboard statistics', async function() {
            const result = await localTools.callTool('get_dashboard_status', {});

            expect(result.success).to.be.true;
            expect(result.result.groupCount).to.equal(2);
            expect(result.result.elementCount).to.equal(5);
            expect(result.result.currentConfig).to.equal('default.json');
            expect(result.result.layout).to.deep.equal({
                columns: 4,
                totalHeight: 20,
                needsScrolling: false
            });
        });
    });

    describe('remove_dashboard_element tool', function() {
        it('should remove element from group', async function() {
            const input = {
                group: 'Group 1',
                element: 'Temperature Sensor'
            };

            const result = await localTools.callTool('remove_dashboard_element', input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Removed element');
            expect(mockDashboard.tools.removeElement).to.have.been.called;
        });
    });

    describe('move_group tool', function() {
        it('should move group up', async function() {
            const input = {
                group: 'Group 2',
                direction: 'up'
            };

            const result = await localTools.callTool('move_group', input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Moved group');
            expect(mockDashboard.tools.moveGroup).to.have.been.called;
        });

        it('should validate direction parameter', async function() {
            const input = {
                group: 'Group 1',
                direction: 'invalid'
            };

            const result = await localTools.callTool('move_group', input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('direction');
        });
    });

    describe('error handling', function() {
        it('should handle unknown tool calls', async function() {
            const result = await localTools.callTool('unknown_tool', {});

            expect(result.success).to.be.false;
            expect(result.error).to.include('Unknown local tool');
        });

        it('should handle tool execution errors', async function() {
            mockDashboard.tools.addGroup.rejects(new Error('Database error'));

            const input = {
                title: 'Test Group'
            };

            const result = await localTools.callTool('create_dashboard_group', input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('Database error');
        });

        it('should validate input schema', async function() {
            const input = {
                group: 'Test',
                type: 'invalid_type', // Not in enum
                caption: 'Test',
                stateId: 'test.state'
            };

            const result = await localTools.callTool('add_dashboard_element', input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('Invalid element type');
        });
    });

    describe('AI service integration', function() {
        it('should provide tool schemas in Claude format', function() {
            const schemas = localTools.getToolSchemas();
            
            // Check Claude tool format
            schemas.forEach(schema => {
                expect(schema.name).to.match(/^[a-z_]+$/); // Snake case
                expect(schema.description).to.be.a('string');
                expect(schema.input_schema.type).to.equal('object');
            });
        });

        it('should handle batch tool calls', async function() {
            const calls = [
                { name: 'create_dashboard_group', input: { title: 'Test Group' } },
                { name: 'add_dashboard_element', input: { 
                    group: 'Test Group', 
                    type: 'gauge', 
                    caption: 'Test', 
                    stateId: 'test.state' 
                }}
            ];

            const results = [];
            for (const call of calls) {
                const result = await localTools.callTool(call.name, call.input);
                results.push(result);
            }

            expect(results).to.have.length(2);
            expect(results[0].success).to.be.true;
            expect(results[1].success).to.be.true;
        });
    });
});