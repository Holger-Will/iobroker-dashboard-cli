import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { createElement } from './dashboard-elements.js';

class ConfigManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            configDir: options.configDir || './dashboard-configs',
            defaultConfig: options.defaultConfig || 'default.json',
            settingsFile: options.settingsFile || 'settings.json',
            autoSave: options.autoSave !== false, // default true
            autoSaveDelay: options.autoSaveDelay || 5000, // 5 seconds
            ...options
        };
        
        this.currentLayout = null;
        this.layoutEngine = null;
        this.autoSaveTimeout = null;
        this.isDirty = false;
    }

    // Initialize config manager with layout engine
    async initialize(layoutEngine) {
        this.layoutEngine = layoutEngine;
        
        // Create config directory if it doesn't exist
        try {
            await fs.mkdir(this.config.configDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create config directory:', error.message);
        }
        
        // Listen for layout changes
        if (layoutEngine) {
            layoutEngine.on('layout-changed', () => {
                this.markDirty();
            });
        }
    }

    // Mark configuration as dirty (needs saving)
    markDirty() {
        this.isDirty = true;
        
        if (this.config.autoSave) {
            this.scheduleAutoSave();
        }
        
        this.emit('dirty');
    }

    // Schedule auto-save
    scheduleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(async () => {
            if (this.isDirty) {
                await this.save();
            }
        }, this.config.autoSaveDelay);
    }

    // Create configuration object from layout engine
    createConfig() {
        if (!this.layoutEngine) {
            throw new Error('Layout engine not initialized');
        }
        
        const groups = this.layoutEngine.groups.map(group => ({
            id: group.id,
            title: group.title,
            elements: group.elements.map(element => ({
                id: element.id,
                type: element.type,
                caption: element.caption,
                stateId: element.stateId,
                unit: element.unit || '',
                min: element.min,
                max: element.max,
                interactive: element.interactive !== false
            }))
        }));
        
        return {
            version: '1.0.0',
            name: 'Dashboard Configuration',
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            layout: {
                groupWidth: this.layoutEngine.config.groupWidth,
                groupPaddingX: this.layoutEngine.config.groupPaddingX,
                groupPaddingY: this.layoutEngine.config.groupPaddingY,
                showBorders: this.layoutEngine.config.showBorders
            },
            groups
        };
    }

    // Save current configuration
    async save(filename = null) {
        const configFile = filename || this.currentLayout || this.config.defaultConfig;
        const configPath = path.join(this.config.configDir, configFile);
        
        try {
            const config = this.createConfig();
            config.updated = new Date().toISOString();
            
            await fs.writeFile(configPath, JSON.stringify(config, null, 2));
            
            this.isDirty = false;
            this.currentLayout = configFile;
            
            this.emit('saved', { filename: configFile, path: configPath });
            
            return { success: true, filename: configFile, path: configPath };
        } catch (error) {
            this.emit('error', error);
            return { success: false, error: error.message };
        }
    }

    // Load configuration
    async load(filename = null) {
        const configFile = filename || this.config.defaultConfig;
        const configPath = path.join(this.config.configDir, configFile);
        
        try {
            const data = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(data);
            
            // Validate config structure
            if (!this.validateConfig(config)) {
                throw new Error('Invalid configuration format');
            }
            
            // Apply configuration to layout engine
            if (this.layoutEngine) {
                await this.applyConfig(config);
            }
            
            this.currentLayout = configFile;
            this.isDirty = false;
            
            // Update last used dashboard in settings
            await this.updateLastUsedDashboard(configFile);
            
            this.emit('loaded', { filename: configFile, config });
            
            return { success: true, config, filename: configFile };
        } catch (error) {
            this.emit('error', error);
            return { success: false, error: error.message };
        }
    }

    // Apply configuration to layout engine
    async applyConfig(config) {
        if (!this.layoutEngine) return;
        
        // Update layout settings
        if (config.layout) {
            Object.assign(this.layoutEngine.config, config.layout);
        }
        
        // Clear existing groups
        this.layoutEngine.groups = [];
        
        // Add groups from config
        if (config.groups) {
            for (const groupConfig of config.groups) {
                // Create group with proper DashboardElement instances
                const group = {
                    id: groupConfig.id,
                    title: groupConfig.title,
                    elements: groupConfig.elements.map(elementConfig => createElement(elementConfig))
                };
                this.layoutEngine.addGroup(group);
            }
        }
        
        // Recalculate layout
        this.layoutEngine.calculateLayout();
    }

    // Validate configuration structure
    validateConfig(config) {
        if (!config.version || !config.groups) {
            return false;
        }
        
        // Validate groups structure
        for (const group of config.groups) {
            if (!group.id || !Array.isArray(group.elements)) {
                return false;
            }
            
            // Validate elements
            for (const element of group.elements) {
                if (!element.id || !element.type || !element.caption) {
                    return false;
                }
            }
        }
        
        return true;
    }

    // List available configurations
    async listConfigs() {
        try {
            const files = await fs.readdir(this.config.configDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));
            
            const configs = [];
            for (const file of jsonFiles) {
                try {
                    const configPath = path.join(this.config.configDir, file);
                    const data = await fs.readFile(configPath, 'utf8');
                    const config = JSON.parse(data);
                    
                    configs.push({
                        filename: file,
                        name: config.name || file,
                        created: config.created,
                        updated: config.updated,
                        groupCount: config.groups?.length || 0,
                        elementCount: config.groups?.reduce((total, group) => total + group.elements.length, 0) || 0
                    });
                } catch (error) {
                    // Skip invalid files
                    console.warn(`Skipping invalid config file: ${file}`);
                }
            }
            
            return { success: true, configs };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Delete configuration
    async deleteConfig(filename) {
        const configPath = path.join(this.config.configDir, filename);
        
        try {
            await fs.unlink(configPath);
            
            this.emit('deleted', { filename });
            
            return { success: true, filename };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Export configuration as JSON string
    exportConfig() {
        try {
            const config = this.createConfig();
            return { success: true, json: JSON.stringify(config, null, 2) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Import configuration from JSON string
    async importConfig(jsonString, filename = null) {
        try {
            const config = JSON.parse(jsonString);
            
            if (!this.validateConfig(config)) {
                throw new Error('Invalid configuration format');
            }
            
            if (filename) {
                // Save imported config
                const configFile = filename.endsWith('.json') ? filename : `${filename}.json`;
                const configPath = path.join(this.config.configDir, configFile);
                
                await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                
                this.emit('imported', { filename: configFile, config });
                
                return { success: true, filename: configFile, config };
            } else {
                // Apply directly without saving
                if (this.layoutEngine) {
                    await this.applyConfig(config);
                }
                
                return { success: true, config };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get current status
    getStatus() {
        return {
            currentLayout: this.currentLayout,
            isDirty: this.isDirty,
            autoSave: this.config.autoSave,
            configDir: this.config.configDir,
            hasLayoutEngine: !!this.layoutEngine
        };
    }

    // Load application settings
    async loadSettings() {
        const settingsPath = path.join(this.config.configDir, this.config.settingsFile);
        
        try {
            const data = await fs.readFile(settingsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Return default settings if file doesn't exist
            return {
                lastUsedDashboard: this.config.defaultConfig,
                created: new Date().toISOString()
            };
        }
    }

    // Save application settings
    async saveSettings(settings) {
        const settingsPath = path.join(this.config.configDir, this.config.settingsFile);
        
        try {
            settings.updated = new Date().toISOString();
            await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get the dashboard that should be loaded (last used or default)
    async getDefaultDashboard() {
        const settings = await this.loadSettings();
        return settings.lastUsedDashboard || this.config.defaultConfig;
    }

    // Update last used dashboard in settings
    async updateLastUsedDashboard(filename) {
        const settings = await this.loadSettings();
        settings.lastUsedDashboard = filename;
        await this.saveSettings(settings);
    }

    // Clean up
    destroy() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.removeAllListeners();
    }
}

export default ConfigManager;