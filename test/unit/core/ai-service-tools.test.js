import { expect } from 'chai';
import sinon from 'sinon';
import { createTestUserDataDir, cleanupTestDir } from '../../helpers/test-setup.js';

describe('AI Service Local Tools Integration', function() {
    let aiService;
    let mockDashboard;
    let mockAnthropic;
    let testDataDir;

    beforeEach(async function() {
        testDataDir = await createTestUserDataDir();
        
        // Create mock Anthropic client
        mockAnthropic = {
            messages: {
                create: sinon.stub()
            }
        };

        // Create mock dashboard
        mockDashboard = {
            connected: true,
            client: { connected: true, url: 'http://test:8082', isConnected: () => true },
            mcp: { 
                connected: true, 
                isConnected: () => true,
                getAvailableTools: sinon.stub().returns([]),
                getAvailableResources: sinon.stub().returns([]),
                callTool: sinon.stub().resolves({ success: true, result: 'mcp result' })
            },
            tools: {
                addGroup: sinon.stub().resolves({ success: true, group: { id: 'g1', title: 'Test Group' } }),
                addElement: sinon.stub().resolves({ success: true, element: { id: 'e1' } }),
                listGroups: sinon.stub().returns([{ id: 'g1', title: 'Test Group', elements: [] }]),
                getStatus: sinon.stub().returns({ groupCount: 1, elementCount: 0, totalElements: 0 })
            },
            configManager: {
                list: sinon.stub().resolves(['default.json']),
                getCurrentStatus: sinon.stub().returns({ groupCount: 1, elementCount: 0, currentConfig: 'default.json' })
            },
            layout: {
                getLayout: sinon.stub().returns({ columns: 4, totalHeight: 10, needsScrolling: false })
            },
            commands: {
                getAllCommands: sinon.stub().returns([
                    { name: 'add', aliases: ['a'], description: 'Add element', usage: '/add' }
                ])
            }
        };

        // Mock the AI service (we'll need to read the actual implementation)
        const { default: AIService } = await import('../../../ai-service.js');
        aiService = new AIService(mockDashboard);
        aiService.anthropic = mockAnthropic;
        aiService.initialized = true;
    });

    afterEach(async function() {
        await cleanupTestDir(testDataDir);
    });

    describe('tool registration', function() {
        it('should include local tools in available tools', function() {
            const tools = aiService.getAvailableTools();
            
            expect(tools).to.be.an('array');
            
            // Check for local tools
            const toolNames = tools.map(t => t.name);
            expect(toolNames).to.include('add_dashboard_element');
            expect(toolNames).to.include('create_dashboard_group');
            expect(toolNames).to.include('save_dashboard');
            expect(toolNames).to.include('load_dashboard');
        });

        it('should combine MCP and local tools', function() {
            // Mock MCP tools
            mockDashboard.mcp.getAvailableTools.returns([
                { name: 'getState', description: 'Get ioBroker state' },
                { name: 'setState', description: 'Set ioBroker state' }
            ]);

            const tools = aiService.getAvailableTools();
            const toolNames = tools.map(t => t.name);
            
            // Should have both MCP and local tools
            expect(toolNames).to.include('getState'); // MCP
            expect(toolNames).to.include('setState'); // MCP
            expect(toolNames).to.include('add_dashboard_element'); // Local
            expect(toolNames).to.include('create_dashboard_group'); // Local
        });

        it('should format tools for Claude API', function() {
            const tools = aiService.getAvailableTools();
            
            tools.forEach(tool => {
                expect(tool).to.have.property('name');
                expect(tool).to.have.property('description');
                expect(tool).to.have.property('input_schema');
                expect(tool.input_schema).to.have.property('type', 'object');
            });
        });
    });

    describe('tool execution routing', function() {
        it('should route local tool calls correctly', async function() {
            const toolCall = {
                name: 'add_dashboard_element',
                input: {
                    group: 'Test Group',
                    type: 'gauge',
                    caption: 'Temperature',
                    stateId: 'sensor.temp'
                }
            };

            const result = await aiService.executeTool(toolCall.name, toolCall.input);

            expect(result.success).to.be.true;
            expect(result.result.message).to.include('Added gauge element');
            expect(mockDashboard.tools.addElement).to.have.been.called;
        });

        it('should route MCP tool calls correctly', async function() {
            mockDashboard.mcp.callTool = sinon.stub().resolves({
                success: true,
                result: { val: 23.5, ts: Date.now() }
            });

            const toolCall = {
                name: 'getState',
                input: { stateId: 'sensor.temperature' }
            };

            const result = await aiService.executeTool(toolCall.name, toolCall.input);

            expect(result.success).to.be.true;
            expect(mockDashboard.mcp.callTool).to.have.been.calledWith('getState', toolCall.input);
        });

        it('should handle tool execution errors gracefully', async function() {
            const toolCall = {
                name: 'add_dashboard_element',
                input: {
                    group: 'Test Group',
                    type: 'invalid_type', // Invalid type
                    caption: 'Test',
                    stateId: 'test.state'
                }
            };

            const result = await aiService.executeTool(toolCall.name, toolCall.input);

            expect(result.success).to.be.false;
            expect(result.error).to.include('Invalid element type');
        });
    });

    describe('natural language to tool calls', function() {
        it('should process natural language request with tool calls', async function() {
            // Skip this test as it requires full AI integration
            this.skip();
        });

        it('should handle multiple tool calls in sequence', async function() {
            // Skip this test as it requires full AI integration
            this.skip();
        });

        it('should provide tool results back to Claude for follow-up', async function() {
            // Skip this test as it requires full AI integration
            this.skip();
        });
    });

    describe('enhanced system prompt', function() {
        it('should include local tool descriptions in system prompt', function() {
            const context = aiService.getDashboardContext();
            const systemPrompt = aiService.buildSystemPrompt(context);
            
            expect(systemPrompt).to.include('LOCAL DASHBOARD TOOLS');
            expect(systemPrompt).to.include('add_dashboard_element');
            expect(systemPrompt).to.include('create_dashboard_group');
            expect(systemPrompt).to.include('NEVER generate text commands');
        });

        it('should instruct Claude to use function calls over text commands', function() {
            const context = aiService.getDashboardContext();
            const systemPrompt = aiService.buildSystemPrompt(context);
            
            expect(systemPrompt).to.include('ALWAYS use function calls');
            expect(systemPrompt).to.include('instead of generating text commands');
        });
    });

    describe('error handling and fallbacks', function() {
        it('should handle missing tools gracefully', async function() {
            // Mock MCP to not have the tool either
            mockDashboard.mcp.callTool.rejects(new Error('Tool not found'));
            
            try {
                const result = await aiService.executeTool('nonexistent_tool', {});
                expect(result.success).to.be.false;
                expect(result.error).to.include('Tool not found');
            } catch (error) {
                expect(error.message).to.include('Tool not found');
            }
        });

        it('should handle tool execution failures', async function() {
            mockDashboard.tools.addGroup.rejects(new Error('Database error'));

            const result = await aiService.executeTool('create_dashboard_group', {
                title: 'Test Group'
            });

            expect(result.success).to.be.false;
            expect(result.error).to.include('Database error');
        });

        it('should continue processing even if one tool fails', async function() {
            // Mock mixed success/failure responses
            mockDashboard.tools.addGroup.resolves({ success: true, group: { id: 'g1' } });
            mockDashboard.tools.addElement.rejects(new Error('Element error'));

            mockAnthropic.messages.create.resolves({
                content: [
                    {
                        type: 'tool_use',
                        name: 'create_dashboard_group',
                        id: 'tool_1',
                        input: { title: 'Test Group' }
                    },
                    {
                        type: 'tool_use',
                        name: 'add_dashboard_element',
                        id: 'tool_2',
                        input: {
                            group: 'Test Group',
                            type: 'gauge',
                            caption: 'Test',
                            stateId: 'test.state'
                        }
                    }
                ]
            });

            // Should not throw, should continue processing
            try {
                await aiService.processNaturalLanguageQuery('Create group and add element');
                // Test passes if no exception is thrown
            } catch (error) {
                expect.fail(`Should not have thrown an error: ${error.message}`);
            }
        });
    });
});