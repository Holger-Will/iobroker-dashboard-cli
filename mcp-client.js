import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

class MCPClient {
    constructor(config = {}) {
        this.config = {
            serverUrl: config.serverUrl || 'http://192.168.178.38:8082/mcp',
            timeout: config.timeout || 30000,
            ...config
        };
        
        this.client = null;
        this.transport = null;
        this.connected = false;
        this.tools = new Map();
        this.resources = new Map();
    }

    async connect() {
        try {
            console.log(`[MCP] Connecting to MCP server at ${this.config.serverUrl}...`);
            
            // Create StreamableHTTPClientTransport
            this.transport = new StreamableHTTPClientTransport(this.config.serverUrl);
            
            // Create MCP client
            this.client = new Client({
                name: 'iobroker-dashboard-cli',
                version: '1.0.0'
            }, {
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {}
                }
            });

            // Connect to the MCP server
            await this.client.connect(this.transport);
            
            this.connected = true;
            console.log('[MCP] Connected to MCP server');
            
            // List available tools and resources
            await this.discoverCapabilities();
            
            return true;
        } catch (error) {
            console.error('[MCP] Failed to connect to MCP server:', error.message);
            this.connected = false;
            return false;
        }
    }

    async discoverCapabilities() {
        try {
            // List available tools
            const toolsResponse = await this.client.listTools();
            if (toolsResponse.tools) {
                this.tools.clear();
                toolsResponse.tools.forEach(tool => {
                    this.tools.set(tool.name, tool);
                });
                console.log(`[MCP] Discovered ${this.tools.size} MCP tools:`, Array.from(this.tools.keys()));
            }

            // List available resources
            const resourcesResponse = await this.client.listResources();
            if (resourcesResponse.resources) {
                this.resources.clear();
                resourcesResponse.resources.forEach(resource => {
                    this.resources.set(resource.uri, resource);
                });
                console.log(`📚 Discovered ${this.resources.size} MCP resources`);
            }

        } catch (error) {
            console.error('[MCP] Failed to discover MCP capabilities:', error.message);
        }
    }

    async callTool(toolName, arguments_) {
        if (!this.connected || !this.client) {
            throw new Error('MCP client not connected');
        }

        if (!this.tools.has(toolName)) {
            throw new Error(`Tool '${toolName}' not available`);
        }

        try {
            const response = await this.client.callTool({
                name: toolName,
                arguments: arguments_ || {}
            });

            return {
                success: true,
                result: response.content,
                isError: response.isError
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getResource(uri) {
        if (!this.connected || !this.client) {
            throw new Error('MCP client not connected');
        }

        try {
            const response = await this.client.readResource({
                uri: uri
            });

            return {
                success: true,
                content: response.contents
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Helper methods for common ioBroker operations
    async getStates(pattern = '*') {
        return await this.callTool('get_states', { pattern });
    }

    async getObjects(pattern = '*') {
        return await this.callTool('get_objects', { pattern });
    }

    async getObjectMetadata(id) {
        return await this.callTool('get_object', { id });
    }

    async setState(id, value, ack = false) {
        return await this.callTool('set_state', { id, value, ack });
    }

    async getAdapters() {
        return await this.callTool('get_adapters');
    }

    async getInstances() {
        return await this.callTool('get_instances');
    }

    async searchStates(query) {
        return await this.callTool('search_states', { query });
    }

    async getStateHistory(id, options = {}) {
        return await this.callTool('get_history', { id, ...options });
    }

    // Get available tools for AI context
    getAvailableTools() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema
        }));
    }

    // Get available resources for AI context
    getAvailableResources() {
        return Array.from(this.resources.values()).map(resource => ({
            uri: resource.uri,
            name: resource.name,
            description: resource.description,
            mimeType: resource.mimeType
        }));
    }

    isConnected() {
        return this.connected;
    }

    async disconnect() {
        if (this.client && this.connected) {
            try {
                await this.client.close();
                console.log('📴 Disconnected from MCP server');
            } catch (error) {
                console.error('Error disconnecting from MCP server:', error.message);
            }
        }
        
        this.connected = false;
        this.client = null;
        this.transport = null;
        this.tools.clear();
        this.resources.clear();
    }

    // Enhanced state metadata with MCP fallback
    async getEnhancedStateMetadata(stateId) {
        try {
            // Try MCP first for richer metadata
            const mcpResult = await this.getObjectMetadata(stateId);
            if (mcpResult.success) {
                const objData = mcpResult.result;
                return {
                    source: 'mcp',
                    exists: true,
                    data: objData,
                    common: objData?.common,
                    type: objData?.common?.type,
                    role: objData?.common?.role,
                    unit: objData?.common?.unit,
                    min: objData?.common?.min,
                    max: objData?.common?.max,
                    write: objData?.common?.write,
                    name: objData?.common?.name,
                    desc: objData?.common?.desc
                };
            }
        } catch (error) {
            console.warn(`MCP metadata lookup failed for ${stateId}:`, error.message);
        }

        return {
            source: 'none',
            exists: false,
            error: 'No metadata available'
        };
    }
}

export default MCPClient;