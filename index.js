#!/usr/bin/env node

import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
// Load environment variables first
dotenv.config();

// User data directory in user space
const USER_DATA_DIR = path.join(os.homedir(), '.iobroker-dashboard-cli');

import IoBrokerClient from './iobroker-client.js';
import LayoutEngine from './layout-engine.js';
import SmoothRenderer from './smooth-renderer.js';
import ConfigManager from './config-manager.js';
import DashboardTools from './dashboard-tools.js';
import { createElements } from './dashboard-elements.js';
import CommandRegistry from './commands/command-registry.js';
import AIService from './ai-service.js';
import MCPClient from './mcp-client.js';
import OnboardingSystem from './onboarding-system.js';
import { UnifiedSettingsManager } from './unified-settings-manager.js';
import { applyTheme } from './colors.js';

class IobrkerDashboard {
    constructor(options = {}) {
        this.config = {
            iobrokerUrl: options.iobrokerUrl || 'http://192.168.178.38:8082',
            configDir: options.configDir || path.join(USER_DATA_DIR, 'dashboard-configs'),
            defaultLayout: options.defaultLayout || 'default.json',
            userDataDir: USER_DATA_DIR,
            groupWidth: options.groupWidth || 59,
            groupPaddingX: options.groupPaddingX || 1,
            groupPaddingY: options.groupPaddingY || 1,
            ...options
        };

        // Core components
        this.client = null;
        this.layout = null;
        this.renderer = null;
        this.configManager = null;
        this.tools = null;
        this.commands = null;
        this.ai = null;
        this.mcp = null;
        this.onboarding = null;
        
        // State
        this.running = false;
        this.connected = false;
        this.inputBuffer = '';
        this.currentPrompt = '> ';
        this.messages = [];
        this.isOnboarding = false;
        this.onboardingStep = 'connection'; // connection, dashboard, complete
        this.messageScrollOffset = 0;
        
        // Interactive element navigation
        this.selectedElementIndex = -1; // -1 means no element selected
        this.interactiveElements = []; // Cached list of interactive elements
        
        // UI state
        this.commandMode = false; // Toggle between dashboard and command mode
        
        // Command history
        this.commandHistory = []; // Store previous commands
        this.historyIndex = -1; // Current position in history (-1 = not browsing)
    }

    async initialize() {
        console.log('[INIT] Initializing ioBroker Dashboard...');

        // Create ioBroker client
        this.client = new IoBrokerClient({
            url: this.config.iobrokerUrl
        });

        // Initialize settings manager first
        this.settings = new UnifiedSettingsManager({
            settingsFile: path.join(USER_DATA_DIR, 'settings.json'),
            configDir: this.config.configDir
        });
        await this.settings.initialize();

        // Create layout engine with settings integration
        this.layout = new LayoutEngine({
            settings: this.settings,
            groupWidth: this.config.groupWidth,
            groupPaddingX: this.config.groupPaddingX,
            groupPaddingY: this.config.groupPaddingY
        });

        // Create renderer
        this.renderer = new SmoothRenderer();

        // Create config manager
        this.configManager = new ConfigManager({
            configDir: this.config.configDir,
            defaultConfig: this.config.defaultLayout
        });

        // Create dashboard tools
        this.tools = new DashboardTools(this.layout, this.configManager);

        // Create command registry
        this.commands = new CommandRegistry(this);

        // Create MCP client
        this.mcp = new MCPClient({
            serverUrl: process.env.MCP_SERVER_URL || 'http://192.168.178.38:8082/mcp'
        });

        // Create AI service
        this.ai = new AIService(this);

        // Create onboarding system
        this.onboarding = new OnboardingSystem(this);

        // Initialize config manager
        await this.configManager.initialize(this.layout);

        // Load and apply saved theme
        await this.initializeTheme();

        // Set up event handlers
        this.setupEventHandlers();

        console.log('[SUCCESS] Dashboard initialized');
    }

    async initializeTheme() {
        try {
            // Use the shared settings manager
            const savedTheme = await this.settings.get('theme.name');
            if (savedTheme && savedTheme !== 'default') {
                const success = applyTheme(savedTheme);
                if (success) {
                    console.log(`[THEME] Loaded saved theme: ${savedTheme}`);
                } else {
                    console.log(`[THEME] Failed to load saved theme '${savedTheme}', using default`);
                    applyTheme('default');
                }
            } else {
                console.log('[THEME] Using default theme');
            }
        } catch (error) {
            console.log(`[THEME] Failed to load theme settings: ${error.message}, using default`);
            applyTheme('default');
        }
    }

    setupEventHandlers() {
        // ioBroker client events
        this.client.on('connected', () => {
            this.connected = true;
            this.addSuccessMessage('Connected to ioBroker');
            this.updatePrompt();
            this.renderDashboard();
        });

        this.client.on('disconnected', (reason) => {
            this.connected = false;
            this.addErrorMessage(`Disconnected from ioBroker: ${reason}`);
            this.updatePrompt();
            this.renderDashboard();
        });

        this.client.on('error', (error) => {
            this.addErrorMessage(`ioBroker Error: ${error.message}`);
            this.renderDashboard();
        });

        // Layout changes
        this.layout.on('layout-changed', () => {
            if (this.running) {
                this.debouncedRender();
            }
        });

        // Config manager events
        this.configManager.on('saved', (data) => {
            if (this.running) {
                this.addSuccessMessage(`[SAVED] Configuration saved: ${data.filename}`);
            }
        });

        this.configManager.on('loaded', async (data) => {
            if (this.running) {
                this.addInfoMessage(`[LOADED] Configuration loaded: ${data.filename}`);
            }
            await this.connectElementsToClient();
            this.renderDashboard();
        });

        this.configManager.on('error', (error) => {
            // Don't log config loading errors - they're handled in the load method
            // This prevents unhandled error events
        });

        // Keyboard input (only in TTY mode)
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            process.stdin.on('data', (key) => {
                this.handleInput(key);
            });
        }

        // Terminal resize
        process.stdout.on('resize', () => {
            if (this.running) {
                this.renderDashboard();
            }
        });
    }

    // Debounced rendering to prevent flicker
    debouncedRender() {
        if (this.renderTimeout) {
            clearTimeout(this.renderTimeout);
        }
        this.renderTimeout = setTimeout(() => {
            this.renderDashboard();
        }, 100);
    }

    updatePrompt() {
        if (this.connected) {
            // Show navigation hints if interactive elements are available
            if (this.interactiveElements.length > 0) {
                if (this.selectedElementIndex >= 0) {
                    const selected = this.getSelectedElement();
                    this.currentPrompt = `[${selected.element.caption}] > `;
                } else {
                    this.currentPrompt = '[Tab:navigate Space:activate /help] > ';
                }
            } else {
                // Show hint about slash commands vs AI input
                const aiStatus = this.ai && this.ai.isAvailable() ? 'AI+' : '';
                this.currentPrompt = `[${aiStatus}/cmd] > `;
            }
        } else {
            this.currentPrompt = '[disconnected] > ';
        }
    }

    async start() {
        if (this.running) return;

        console.log('[CONNECT] Connecting to ioBroker...');
        
        try {
            await this.client.connect();
        } catch (error) {
            console.error('Failed to connect to ioBroker:', error.message);
            process.exit(1);
        }

        // Try to connect to MCP server (optional)
        try {
            await this.mcp.connect();
        } catch (error) {
            console.warn('MCP server connection failed (optional):', error.message);
        }

        // Check if this is first run (no configuration exists)
        console.log('[CONFIG] Checking for existing configuration...');
        const hasExistingConfig = await this.checkForExistingConfiguration();
        
        if (!hasExistingConfig) {
            console.log('[FIRST RUN] First run detected - starting onboarding...');
            this.isOnboarding = true;
            this.onboardingStep = 'socketio-url';
        } else {
            // Try to load last used layout
            console.log('[LOAD] Loading dashboard layout...');
            const lastUsedDashboard = await this.configManager.getDefaultDashboard();
            const loadResult = await this.configManager.load(lastUsedDashboard);
            
            if (loadResult.success) {
                const elementCount = this.layout.groups.reduce((sum, g) => sum + g.elements.length, 0);
                console.log(`[SUCCESS] Loaded dashboard "${loadResult.filename}" with ${this.layout.groups.length} groups and ${elementCount} elements`);
                
                // If this was the last used dashboard, mention it
                if (lastUsedDashboard !== this.configManager.config.defaultConfig) {
                    console.log(`[CONTINUE] Continuing from last session (${lastUsedDashboard})`);
                }
            } else {
                console.log('[WARNING] Could not load dashboard, but configuration exists');
            }
        }

        await this.connectElementsToClient();

        // Subscribe to state changes
        this.client.subscribeStates('*');

        this.running = true;
        
        if (this.isOnboarding) {
            await this.onboarding.startOnboarding();
        } else {
            this.addInfoMessage(`[READY] Dashboard loaded! Type "/help" for commands.`);
            this.renderDashboard();
        }
    }

    async checkForExistingConfiguration() {
        try {
            const userDataDir = this.config.userDataDir;
            const configDir = this.config.configDir;
            
            // Check if user data directory exists
            const userDirExists = await this.directoryExists(userDataDir);
            if (!userDirExists) return false;
            
            // Check if any dashboard configs exist
            try {
                const { readdir } = await import('fs/promises');
                const configFiles = await readdir(configDir);
                const dashboardFiles = configFiles.filter(f => f.endsWith('.json'));
                if (dashboardFiles.length > 0) return true;
            } catch (error) {
                // Config directory doesn't exist yet
            }
            
            // Check for settings file or environment variables
            if (process.env.ANTHROPIC_API_KEY || process.env.MCP_SERVER_URL) {
                return true;
            }
            
            return false;
        } catch (error) {
            return false; // First run
        }
    }

    async directoryExists(dirPath) {
        try {
            const { stat } = await import('fs/promises');
            const stats = await stat(dirPath);
            return stats.isDirectory();
        } catch (error) {
            return false;
        }
    }

    async createDefaultDashboard() {
        // Create a basic dashboard if no config exists
        const solarGroup = await this.tools.addGroup('Solar System');
        if (solarGroup.success) {
            await this.tools.addElement(solarGroup.group.id, {
                id: 'pv-power',
                type: 'gauge',
                caption: 'PV Power',
                stateId: 'javascript.0.solar.produktion',
                unit: 'W'
            });
            
            await this.tools.addElement(solarGroup.group.id, {
                id: 'battery',
                type: 'gauge',
                caption: 'Battery',
                stateId: 'javascript.0.solar.batterie',
                unit: 'W'
            });
        }

        const systemGroup = await this.tools.addGroup('System Status');
        if (systemGroup.success) {
            await this.tools.addElement(systemGroup.group.id, {
                id: 'web-adapter',
                type: 'indicator',
                caption: 'Web Adapter',
                stateId: 'system.adapter.web.0.alive'
            });
        }

        // Save the default layout
        await this.configManager.save();
    }

    async connectElementsToClient() {
        // Connect all elements to the ioBroker client for live updates
        const objectRefreshPromises = [];
        
        for (const group of this.layout.groups) {
            for (const element of group.elements) {
                if (element.connect && typeof element.connect === 'function') {
                    element.connect(this.client);
                    
                    // Listen for value changes to trigger re-render
                    element.on('valueChanged', () => {
                        this.debouncedRender();
                    });
                    
                    // Refresh object metadata from ioBroker for each element
                    if (element.stateId && this.client && this.client.isConnected()) {
                        objectRefreshPromises.push(this.refreshElementObject(element));
                    }
                }
            }
        }
        
        // Wait for all object metadata refreshes to complete
        if (objectRefreshPromises.length > 0) {
            try {
                const results = await Promise.allSettled(objectRefreshPromises);
                const successCount = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
                this.addInfoMessage(`[METADATA] Refreshed object metadata for ${successCount}/${objectRefreshPromises.length} elements`);
                this.debouncedRender();
            } catch (error) {
                this.addWarningMessage(`[METADATA] Some object metadata failed to refresh: ${error.message}`);
            }
        }
    }
    
    async refreshElementObject(element) {
        try {
            const objData = await this.client.getObject(element.stateId);
            if (objData && objData.common) {
                const common = objData.common;
                let updated = false;
                
                // Update unit if it has changed
                if (common.unit !== undefined && element.unit !== common.unit) {
                    element.unit = common.unit;
                    updated = true;
                }
                
                // Update min/max for gauge elements
                if (element.type === 'gauge') {
                    if (common.min !== undefined && element.min !== common.min) {
                        element.min = common.min;
                        updated = true;
                    }
                    if (common.max !== undefined && element.max !== common.max) {
                        element.max = common.max;
                        updated = true;
                    }
                }
                
                // Update interactive flag based on write permission
                if (common.write !== undefined && element.interactive !== (common.write !== false)) {
                    element.interactive = common.write !== false;
                    updated = true;
                }
                
                if (updated) {
                    console.log(`[METADATA] Updated object metadata for ${element.stateId}: unit=${element.unit}, min=${element.min}, max=${element.max}, interactive=${element.interactive}`);
                }
                
                return true;
            }
            return false;
        } catch (error) {
            console.warn(`Failed to refresh object metadata for ${element.stateId}:`, error.message);
            return false;
        }
    }

    renderDashboard() {
        if (!this.running) return;

        // Update the list of interactive elements (only needed in dashboard mode)
        if (!this.commandMode) {
            this.updateInteractiveElements();
        }

        const currentLayout = this.layout.getLayout();
        const selectedElement = this.getSelectedElement();
        this.renderer.updateRender(currentLayout, this.currentPrompt, this.inputBuffer, this.messages, this.messageScrollOffset, selectedElement, this.commandMode);
    }

    // Message system
    addMessage(message, type = 'info') {
        const messageObj = typeof message === 'string' ? { text: message, type } : message;
        this.messages.push(messageObj);
        
        // Keep only last 20 messages
        if (this.messages.length > 20) {
            this.messages = this.messages.slice(-20);
        }
        
        if (this.running) {
            // Use debounced rendering for better message flow
            this.debouncedRender();
        }
    }

    addSuccessMessage(text) {
        this.addMessage(text, 'success');
    }

    addErrorMessage(text) {
        this.addMessage(text, 'error');
    }

    addInfoMessage(text) {
        this.addMessage(text, 'info');
    }

    addWarningMessage(text) {
        this.addMessage(text, 'warning');
    }

    // Interactive Element Navigation
    updateInteractiveElements() {
        this.interactiveElements = [];
        
        for (const group of this.layout.groups) {
            for (const element of group.elements) {
                if (element.interactive && (element.type === 'button' || element.type === 'switch')) {
                    this.interactiveElements.push({
                        element,
                        groupId: group.id,
                        groupTitle: group.title
                    });
                }
            }
        }
        
        // Reset selection if current selection is out of bounds
        if (this.selectedElementIndex >= this.interactiveElements.length) {
            this.selectedElementIndex = -1;
        }
    }

    selectNextInteractiveElement() {
        if (this.interactiveElements.length === 0) {
            this.selectedElementIndex = -1;
            return;
        }
        
        // Cycle through: -1 (none) -> 0 -> 1 -> ... -> length-1 -> -1 (none)
        if (this.selectedElementIndex >= this.interactiveElements.length - 1) {
            this.selectedElementIndex = -1; // Back to "none selected"
        } else {
            this.selectedElementIndex++;
        }
        this.updatePrompt();
        this.renderDashboard();
    }

    selectPreviousInteractiveElement() {
        if (this.interactiveElements.length === 0) {
            this.selectedElementIndex = -1;
            return;
        }
        
        // Cycle through: -1 (none) -> length-1 -> ... -> 1 -> 0 -> -1 (none)
        if (this.selectedElementIndex <= -1) {
            this.selectedElementIndex = this.interactiveElements.length - 1; // To last element
        } else {
            this.selectedElementIndex--;
        }
        this.updatePrompt();
        this.renderDashboard();
    }

    async activateSelectedElement() {
        if (this.selectedElementIndex < 0 || this.selectedElementIndex >= this.interactiveElements.length) {
            return;
        }
        
        const selectedItem = this.interactiveElements[this.selectedElementIndex];
        const element = selectedItem.element;
        
        try {
            if (element.type === 'button') {
                const success = await element.trigger();
                if (success) {
                    this.addInfoMessage(`[TRIGGERED] Triggered: ${element.caption}`);
                } else {
                    this.addErrorMessage(`Failed to trigger: ${element.caption}`);
                }
            } else if (element.type === 'switch') {
                const success = await element.toggle();
                if (success) {
                    this.addInfoMessage(`[TOGGLED] Toggled: ${element.caption}`);
                } else {
                    this.addErrorMessage(`Failed to toggle: ${element.caption}`);
                }
            }
        } catch (error) {
            this.addErrorMessage(`Error activating ${element.caption}: ${error.message}`);
        }
    }

    getSelectedElement() {
        if (this.selectedElementIndex < 0 || this.selectedElementIndex >= this.interactiveElements.length) {
            return null;
        }
        return this.interactiveElements[this.selectedElementIndex];
    }

    async handleInput(key) {
        if (!this.running) return;

        // Handle special keys
        if (key === '\x03') { // Ctrl+C
            this.stop();
            return;
        }

        // Handle Tab for element navigation
        if (key === '\t') { // Tab
            if (this.inputBuffer.length === 0) { // Only navigate when not typing
                this.selectNextInteractiveElement();
            } else {
                // Tab while typing - add to input buffer
                this.inputBuffer += '\t';
                this.renderDashboard();
            }
            return;
        }

        // Handle Shift+Tab for reverse navigation
        if (key === '\x1b[Z') { // Shift+Tab
            if (this.inputBuffer.length === 0) { // Only navigate when not typing
                this.selectPreviousInteractiveElement();
            } else {
                // Shift+Tab while typing - add to input buffer (reverse tab character)
                this.inputBuffer += '\t';
                this.renderDashboard();
            }
            return;
        }

        // Handle Space for element activation
        if (key === ' ') { // Space
            if (this.inputBuffer.length === 0 && this.selectedElementIndex >= 0) {
                // Space while element is selected - activate it
                this.activateSelectedElement();
            } else {
                // Space while typing - add to input buffer
                this.inputBuffer += key;
                this.renderDashboard();
            }
            return;
        }

        // Handle left/right arrow keys for cursor movement in input
        if (key === '\x1b[C') { // Right arrow
            // TODO: Implement cursor movement in input buffer
            // For now, do nothing to allow normal terminal behavior
            return;
        }

        if (key === '\x1b[D') { // Left arrow  
            // TODO: Implement cursor movement in input buffer
            // For now, do nothing to allow normal terminal behavior
            return;
        }

        // Handle up/down arrow keys - smart context switching
        if (key === '\x1b[A') { // Up arrow
            if (this.inputBuffer.length === 0) {
                // No input - scroll messages up
                this.scrollMessagesUp();
            } else {
                // Has input - browse command history (previous command)
                this.browseHistoryPrevious();
            }
            return;
        }

        if (key === '\x1b[B') { // Down arrow
            if (this.inputBuffer.length === 0) {
                // No input - scroll messages down
                this.scrollMessagesDown();
            } else {
                // Has input - browse command history (next command)
                this.browseHistoryNext();
            }
            return;
        }

        if (key === '\r' || key === '\n') { // Enter
            const command = this.inputBuffer.trim();
            if (command) {
                // Add to command history (avoid duplicates)
                if (this.commandHistory.length === 0 || this.commandHistory[this.commandHistory.length - 1] !== command) {
                    this.commandHistory.push(command);
                    
                    // Keep only last 50 commands
                    if (this.commandHistory.length > 50) {
                        this.commandHistory = this.commandHistory.slice(-50);
                    }
                }
                
                await this.processCommand(command);
            }
            
            this.inputBuffer = '';
            this.historyIndex = -1; // Reset history browsing
            this.messageScrollOffset = 0; // Reset scroll when entering command
            this.selectedElementIndex = -1; // Reset element selection when entering command
            this.updatePrompt();
            this.renderDashboard();
            return;
        }

        if (key === '\x7f' || key === '\b') { // Backspace
            if (this.inputBuffer.length > 0) {
                this.inputBuffer = this.inputBuffer.slice(0, -1);
                this.renderDashboard();
            }
            return;
        }

        // Handle Escape to toggle command mode or deselect element
        if (key === '\x1b') { // Escape
            if (this.selectedElementIndex >= 0) {
                // If element is selected, deselect it first
                this.selectedElementIndex = -1;
                this.updatePrompt();
                this.renderDashboard();
            } else {
                // Toggle command mode
                this.commandMode = !this.commandMode;
                
                // Force complete re-render when switching modes
                this.renderer.initialized = false;
                this.renderer.elementPositions.clear();
                
                this.updatePrompt();
                this.renderDashboard();
                
                const modeText = this.commandMode ? 'Command Mode (full screen output)' : 'Dashboard Mode';
                this.addInfoMessage(`[MODE] Switched to ${modeText}`);
            }
            return;
        }

        // Handle Alt+number keys for dashboard hotkeys
        // Alt+number sends escape sequence like '\x1b1', '\x1b2', etc.
        if (key.length === 2 && key[0] === '\x1b' && key[1] >= '0' && key[1] <= '9') {
            await this.handleDashboardHotkey(key[1]);
            return;
        }

        // Regular characters
        if (key >= ' ' && key <= '~') {
            this.inputBuffer += key;
            this.renderDashboard();
        }
    }

    scrollMessagesUp() {
        const maxMessageAreaHeight = 8;
        const maxScroll = Math.max(0, this.messages.length - maxMessageAreaHeight + 2);
        
        if (this.messageScrollOffset < maxScroll) {
            this.messageScrollOffset++;
            this.renderDashboard();
        }
    }

    scrollMessagesDown() {
        if (this.messageScrollOffset > 0) {
            this.messageScrollOffset--;
            this.renderDashboard();
        }
    }

    async handleDashboardHotkey(key) {
        try {
            // Load hotkey assignments from settings
            const settings = await this.configManager.loadSettings();
            const hotkeys = settings.hotkeys || {};
            
            const filename = hotkeys[key];
            if (!filename) {
                this.addWarningMessage(`[HOTKEY] Alt+${key}: No dashboard assigned`);
                this.addInfoMessage('[TIP] Use /hotkey -n ' + key + ' -f <filename> to assign a dashboard');
                this.addInfoMessage('[TIP] Use /hotkey -l to see all assignments');
                return;
            }

            const loadResult = await this.configManager.load(filename);
            
            if (loadResult.success) {
                await this.connectElementsToClient();
                
                // Force complete re-render
                this.renderer.initialized = false;
                this.renderer.elementPositions.clear();
                
                this.renderDashboard();
                
                const elementCount = this.layout.groups.reduce((sum, g) => sum + g.elements.length, 0);
                this.addSuccessMessage(`[HOTKEY] Alt+${key}: Loaded "${filename}" (${this.layout.groups.length} groups, ${elementCount} elements)`);
            } else {
                this.addWarningMessage(`[HOTKEY] Alt+${key}: Dashboard "${filename}" not found`);
                this.addInfoMessage('[TIP] Use /hotkey -n ' + key + ' -f <filename> to reassign');
            }
        } catch (error) {
            this.addErrorMessage(`[HOTKEY] Alt+${key}: Error: ${error.message}`);
        }
    }

    browseHistoryPrevious() {
        if (this.commandHistory.length === 0) return;
        
        // If not currently browsing history, start from the end
        if (this.historyIndex === -1) {
            this.historyIndex = this.commandHistory.length - 1;
        } else if (this.historyIndex > 0) {
            this.historyIndex--;
        } else {
            // Already at the beginning, do nothing
            return;
        }
        
        this.inputBuffer = this.commandHistory[this.historyIndex];
        this.renderDashboard();
    }

    browseHistoryNext() {
        if (this.commandHistory.length === 0 || this.historyIndex === -1) return;
        
        if (this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            this.inputBuffer = this.commandHistory[this.historyIndex];
        } else {
            // At the end, clear input buffer
            this.historyIndex = -1;
            this.inputBuffer = '';
        }
        
        this.renderDashboard();
    }

    async processCommand(command) {
        if (!command) return;

        // Handle onboarding input first
        if (this.isOnboarding) {
            const handled = await this.onboarding.handleInput(command);
            if (handled) {
                this.updatePrompt();
                this.renderDashboard();
            }
            return;
        }

        // Check if command starts with slash (/) - these are explicit commands
        if (command.startsWith('/')) {
            await this.processSlashCommand(command);
        } else {
            // Non-slash commands are treated as AI input
            await this.processAIInput(command);
        }
    }

    async processSlashCommand(command) {
        // Remove the leading slash
        const commandWithoutSlash = command.substring(1);
        
        if (!commandWithoutSlash) {
            this.addErrorMessage('Empty command. Type /help for available commands.');
            return;
        }

        const args = commandWithoutSlash.split(' ');
        const cmd = args[0].toLowerCase();
        const commandArgs = args.slice(1);

        // Try the command registry with the command name (without slash)
        const handled = await this.commands.execute(cmd, commandArgs);
        if (handled) {
            return;
        }

        // Command not found
        this.addErrorMessage(`Unknown command: /${cmd}`);
        this.addInfoMessage('Available commands:');
        const availableCommands = this.commands.getAllCommands();
        const commandNames = availableCommands.map(c => `/${c.name}`).slice(0, 8); // Show first 8
        this.addInfoMessage(`  ${commandNames.join(', ')}`);
        if (availableCommands.length > 8) {
            this.addInfoMessage(`  ... and ${availableCommands.length - 8} more`);
        }
        this.addInfoMessage('Type /help for detailed help');
    }

    async processAIInput(input) {
        // Process non-slash input as AI natural language
        if (this.ai && this.ai.isAvailable()) {
            this.addInfoMessage(`[AI] Processing natural language: "${input}"`);
            try {
                const aiResult = await this.ai.processNaturalLanguageQuery(input);
                await this.ai.executeAIResponse(aiResult);
            } catch (aiError) {
                this.addErrorMessage(`AI processing failed: ${aiError.message}`);
                this.addInfoMessage('[TIP] Tip: Use /commands for explicit commands (e.g., /help, /add, /ls)');
            }
        } else {
            this.addErrorMessage('AI assistant not available');
            this.addInfoMessage('[TIP] Set ANTHROPIC_API_KEY to enable AI assistance');
            this.addInfoMessage('[TIP] Use /commands for explicit commands (e.g., /help, /add, /ls)');
        }
    }

    showHelp() {
        if (this.isOnboarding && this.onboardingStep === 'connection') {
            this.addInfoMessage('[HELP] Connection setup commands:');
            this.showCommandsInColumns([
                ['set-url <ip:port>', 'Set ioBroker URL'],
                ['test-connection', 'Test connection to ioBroker'],
                ['skip-connection', 'Continue with current settings'],
                ['help', 'Show this help'],
                ['exit', 'Exit without saving']
            ]);
        } else if (this.isOnboarding && this.onboardingStep === 'dashboard') {
            this.addInfoMessage('[HELP] Dashboard setup commands:');
            this.showCommandsInColumns([
                ['create-group <name>', 'Create a new group'],
                ['add-state <group> <caption> <stateId> [type]', 'Add element (type auto-detected)'],
                ['list', 'List current groups'],
                ['save', 'Save dashboard and finish setup'],
                ['exit', 'Exit without saving']
            ]);
        } else {
            this.addInfoMessage('[HELP] Available commands:');
            
            // Get all commands from registry
            const registryCommands = this.commands.getCommandHelp();
            this.showCommandsInColumns(registryCommands);
        }
    }

    showCommandsInColumns(commands) {
        const terminalWidth = process.stdout.columns || 80;
        const columnWidth = Math.floor((terminalWidth - 4) / 2); // Account for spacing
        
        for (let i = 0; i < commands.length; i += 2) {
            const leftCmd = commands[i];
            const rightCmd = commands[i + 1];
            
            let line = '';
            
            // Format left command
            if (leftCmd) {
                const leftText = `  ${leftCmd[0]}`;
                const leftDesc = leftCmd[1];
                const leftPadding = Math.max(1, columnWidth - leftText.length - leftDesc.length);
                line += leftText + ' '.repeat(leftPadding) + leftDesc;
            }
            
            // Add spacing between columns
            if (rightCmd && leftCmd) {
                line = line.padEnd(columnWidth + 2, ' ');
            }
            
            // Format right command
            if (rightCmd) {
                const rightText = `  ${rightCmd[0]}`;
                const rightDesc = rightCmd[1];
                const rightPadding = Math.max(1, columnWidth - rightText.length - rightDesc.length);
                line += rightText + ' '.repeat(rightPadding) + rightDesc;
            }
            
            this.addInfoMessage(line);
        }
    }

    async stop() {
        if (!this.running) return;

        console.log('\n[SHUTDOWN] Shutting down dashboard...');
        
        this.running = false;
        
        if (this.client) {
            this.client.disconnect();
        }

        if (this.mcp) {
            await this.mcp.disconnect();
        }
        
        if (this.configManager) {
            this.configManager.destroy();
        }
        
        // Restore terminal
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
        }
        
        process.exit(0);
    }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    const dashboard = new IobrkerDashboard();
    
    try {
        await dashboard.initialize();
        await dashboard.start();
    } catch (error) {
        console.error('Failed to start dashboard:', error.message);
        process.exit(1);
    }
}

export default IobrkerDashboard;