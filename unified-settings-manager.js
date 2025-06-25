/**
 * Unified Settings Manager for ioBroker Dashboard CLI
 * 
 * Consolidates configuration from multiple sources:
 * - .env file (environment variables)
 * - settings.json (persistent settings)
 * - Runtime configuration (temporary overrides)
 * 
 * Supports dot-notation keys like:
 * - iobroker.url
 * - theme.border
 * - theme.colors.primary
 * - dashboard.auto_save
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// User data directory in user space
const USER_DATA_DIR = path.join(os.homedir(), '.iobroker-dashboard-cli');

export class UnifiedSettingsManager extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.envFile = options.envFile || path.join(__dirname, '.env');
        this.settingsFile = options.settingsFile || path.join(USER_DATA_DIR, 'settings.json');
        this.configDir = options.configDir || path.join(USER_DATA_DIR, 'dashboard-configs');
        this.userDataDir = USER_DATA_DIR;
        
        // Layered configuration: env < settings < runtime
        this.envConfig = new Map();
        this.persistentConfig = new Map();
        this.runtimeConfig = new Map();
        
        // Built-in defaults
        this.defaults = new Map([
            ['iobroker.url', 'http://192.168.178.38:8082'],
            ['iobroker.namespace', 'admin'],
            ['mcp.server_url', 'http://192.168.178.38:8082/mcp'],
            ['dashboard.auto_save', true],
            ['dashboard.config_dir', path.join(USER_DATA_DIR, 'dashboard-configs')],
            ['dashboard.default_layout', 'default.json'],
            ['dashboard.group_width', 59],
            ['dashboard.group_padding_x', 1],
            ['dashboard.group_padding_y', 1],
            ['theme.name', 'default'],
            ['theme.border', true],
            ['theme.colors.primary', '#00ff00'],
            ['theme.colors.secondary', '#0099ff'],
            ['theme.colors.success', '#00ff00'],
            ['theme.colors.error', '#ff0044'],
            ['theme.colors.warning', '#ffaa00'],
            ['theme.colors.info', '#00aaff'],
            ['ui.command_mode', false],
            ['ui.message_scroll_lines', 8],
            ['ai.anthropic_api_key', ''],
            ['hotkeys.dashboard_1', 'dashboard1.json'],
            ['hotkeys.dashboard_2', 'dashboard2.json'],
            ['hotkeys.dashboard_3', 'dashboard3.json'],
            ['hotkeys.dashboard_4', 'dashboard4.json'],
            ['hotkeys.dashboard_5', 'dashboard5.json'],
            ['hotkeys.dashboard_6', 'dashboard6.json'],
            ['hotkeys.dashboard_7', 'dashboard7.json'],
            ['hotkeys.dashboard_8', 'dashboard8.json'],
            ['hotkeys.dashboard_9', 'dashboard9.json'],
            ['hotkeys.dashboard_0', 'dashboard0.json']
        ]);
        
        this.initialized = false;
    }

    /**
     * Initialize the settings manager
     */
    async initialize() {
        if (this.initialized) return;
        
        try {
            // Ensure user data directory exists
            await this.ensureUserDataDirectory();
            
            await this.loadEnvConfig();
            await this.loadPersistentConfig();
            this.initialized = true;
            this.emit('initialized');
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Ensure user data directory structure exists
     */
    async ensureUserDataDirectory() {
        try {
            // Create base user data directory
            await fs.mkdir(this.userDataDir, { recursive: true });
            
            // Create subdirectories
            await fs.mkdir(this.configDir, { recursive: true });
            
            const logsDir = path.join(this.userDataDir, 'logs');
            await fs.mkdir(logsDir, { recursive: true });
            
            const cacheDir = path.join(this.userDataDir, 'cache');
            await fs.mkdir(cacheDir, { recursive: true });
            
            console.log(`[CONFIG] User data directory: ${this.userDataDir}`);
        } catch (error) {
            console.error(`Failed to create user data directory: ${error.message}`);
            throw error;
        }
    }

    /**
     * Load configuration from .env file
     */
    async loadEnvConfig() {
        try {
            const envContent = await fs.readFile(this.envFile, 'utf8');
            const lines = envContent.split('\n');
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').replace(/^["']|["']$/g, '');
                    const dotKey = this.envKeyToDotNotation(key.trim());
                    this.envConfig.set(dotKey, this.parseValue(value));
                }
            }
        } catch (error) {
            // .env file is optional
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * Load persistent configuration from settings.json
     */
    async loadPersistentConfig() {
        try {
            const settingsContent = await fs.readFile(this.settingsFile, 'utf8');
            const settings = JSON.parse(settingsContent);
            
            // Flatten nested object to dot notation
            this.flattenObject(settings, '', this.persistentConfig);
        } catch (error) {
            // settings.json is optional
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * Save persistent configuration to settings.json
     */
    async savePersistentConfig() {
        try {
            // Convert flat dot notation back to nested object
            const nestedConfig = this.unflattenMap(this.persistentConfig);
            const settingsContent = JSON.stringify(nestedConfig, null, 2);
            
            await fs.writeFile(this.settingsFile, settingsContent, 'utf8');
            this.emit('saved', { file: this.settingsFile, type: 'persistent' });
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    /**
     * Get a configuration value with dot notation
     * @param {string} key - Dot notation key (e.g., 'iobroker.url')
     * @param {*} defaultValue - Default value if key not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue = undefined) {
        // Priority: runtime > persistent > env > defaults > defaultValue
        if (this.runtimeConfig.has(key)) {
            return this.runtimeConfig.get(key);
        }
        if (this.persistentConfig.has(key)) {
            return this.persistentConfig.get(key);
        }
        if (this.envConfig.has(key)) {
            return this.envConfig.get(key);
        }
        if (this.defaults.has(key)) {
            return this.defaults.get(key);
        }
        return defaultValue;
    }

    /**
     * Set a configuration value
     * @param {string} key - Dot notation key
     * @param {*} value - Value to set
     * @param {boolean} persistent - Whether to save to persistent storage
     */
    async set(key, value, persistent = true) {
        const oldValue = this.get(key);
        const parsedValue = this.parseValue(value);
        
        if (persistent) {
            this.persistentConfig.set(key, parsedValue);
            await this.savePersistentConfig();
        } else {
            this.runtimeConfig.set(key, parsedValue);
        }
        
        this.emit('changed', { key, oldValue, newValue: parsedValue, persistent });
    }

    /**
     * Remove a configuration value
     * @param {string} key - Dot notation key
     * @param {boolean} persistent - Whether to remove from persistent storage
     */
    async remove(key, persistent = true) {
        const oldValue = this.get(key);
        
        if (persistent && this.persistentConfig.has(key)) {
            this.persistentConfig.delete(key);
            await this.savePersistentConfig();
        }
        
        if (this.runtimeConfig.has(key)) {
            this.runtimeConfig.delete(key);
        }
        
        this.emit('removed', { key, oldValue, persistent });
    }

    /**
     * Check if a key exists
     * @param {string} key - Dot notation key
     * @returns {boolean} True if key exists
     */
    has(key) {
        return this.runtimeConfig.has(key) || 
               this.persistentConfig.has(key) || 
               this.envConfig.has(key) || 
               this.defaults.has(key);
    }

    /**
     * Get all keys matching a prefix
     * @param {string} prefix - Key prefix (e.g., 'theme')
     * @returns {Array<string>} Array of matching keys
     */
    getKeysWithPrefix(prefix) {
        const keys = new Set();
        const searchPrefix = prefix.endsWith('.') ? prefix : `${prefix}.`;
        
        for (const map of [this.runtimeConfig, this.persistentConfig, this.envConfig, this.defaults]) {
            for (const key of map.keys()) {
                if (key.startsWith(searchPrefix) || key === prefix) {
                    keys.add(key);
                }
            }
        }
        
        return Array.from(keys).sort();
    }

    /**
     * Get all settings as a nested object
     * @param {string} prefix - Optional prefix to filter by
     * @returns {Object} Nested configuration object
     */
    getAll(prefix = '') {
        const result = new Map();
        
        // Merge all layers in priority order
        for (const map of [this.defaults, this.envConfig, this.persistentConfig, this.runtimeConfig]) {
            for (const [key, value] of map) {
                if (!prefix || key.startsWith(prefix)) {
                    result.set(key, value);
                }
            }
        }
        
        return this.unflattenMap(result);
    }

    /**
     * Apply theme settings
     * @param {string} themeName - Theme name or theme object
     */
    async applyTheme(themeName) {
        let theme;
        
        if (typeof themeName === 'string') {
            theme = this.getBuiltinTheme(themeName);
            if (!theme) {
                throw new Error(`Unknown theme: ${themeName}`);
            }
        } else {
            theme = themeName;
        }
        
        // Apply theme settings recursively
        await this.applyThemeRecursive('theme', theme, true);
        
        this.emit('theme-applied', { theme: themeName });
    }

    /**
     * Apply theme settings recursively
     * @param {string} prefix - Current key prefix
     * @param {Object} obj - Object to apply
     * @param {boolean} persistent - Whether to save persistently
     */
    async applyThemeRecursive(prefix, obj, persistent) {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = `${prefix}.${key}`;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                await this.applyThemeRecursive(fullKey, value, persistent);
            } else {
                await this.set(fullKey, value, persistent);
            }
        }
    }

    /**
     * Get built-in theme by name
     * @param {string} name - Theme name
     * @returns {Object|null} Theme object or null if not found
     */
    getBuiltinTheme(name) {
        const themes = {
            default: {
                name: 'default',
                colors: {
                    primary: '#00ff00',
                    secondary: '#0099ff',
                    success: '#00ff00',
                    error: '#ff0044',
                    warning: '#ffaa00',
                    info: '#00aaff'
                }
            },
            dark: {
                name: 'dark',
                colors: {
                    primary: '#50fa7b',
                    secondary: '#8be9fd',
                    success: '#50fa7b',
                    error: '#ff5555',
                    warning: '#f1fa8c',
                    info: '#8be9fd'
                }
            },
            light: {
                name: 'light',
                colors: {
                    primary: '#007700',
                    secondary: '#0066cc',
                    success: '#007700',
                    error: '#cc0000',
                    warning: '#cc7700',
                    info: '#0066cc'
                }
            },
            matrix: {
                name: 'matrix',
                colors: {
                    primary: '#00ff41',
                    secondary: '#008f11',
                    success: '#00ff41',
                    error: '#ff0000',
                    warning: '#ffff00',
                    info: '#00ff41'
                }
            },
            retro: {
                name: 'retro',
                colors: {
                    primary: '#ffb000',
                    secondary: '#ff6b35',
                    success: '#7cb342',
                    error: '#e53935',
                    warning: '#ffb000',
                    info: '#039be5'
                }
            },
            ocean: {
                name: 'ocean',
                colors: {
                    primary: '#00bcd4',
                    secondary: '#0097a7',
                    success: '#4caf50',
                    error: '#f44336',
                    warning: '#ff9800',
                    info: '#2196f3'
                }
            }
        };
        
        return themes[name] || null;
    }

    /**
     * Get list of available themes
     * @returns {Array<string>} Array of theme names
     */
    getThemeNames() {
        return ['default', 'dark', 'light', 'matrix', 'retro', 'ocean'];
    }

    /**
     * Convert environment variable key to dot notation
     * @param {string} envKey - Environment variable key
     * @returns {string} Dot notation key
     */
    envKeyToDotNotation(envKey) {
        // Convert IOBROKER_URL to iobroker.url
        return envKey.toLowerCase().replace(/_/g, '.');
    }

    /**
     * Parse string value to appropriate type
     * @param {string} value - String value to parse
     * @returns {*} Parsed value
     */
    parseValue(value) {
        if (typeof value !== 'string') return value;
        
        // Boolean values
        if (value.toLowerCase() === 'true') return true;
        if (value.toLowerCase() === 'false') return false;
        
        // Number values
        if (/^\d+$/.test(value)) return parseInt(value, 10);
        if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
        
        // JSON values
        if ((value.startsWith('{') && value.endsWith('}')) || 
            (value.startsWith('[') && value.endsWith(']'))) {
            try {
                return JSON.parse(value);
            } catch {
                // If parsing fails, keep as string
            }
        }
        
        return value;
    }

    /**
     * Flatten nested object to dot notation map
     * @param {Object} obj - Object to flatten
     * @param {string} prefix - Current prefix
     * @param {Map} result - Result map
     */
    flattenObject(obj, prefix, result) {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                this.flattenObject(value, fullKey, result);
            } else {
                result.set(fullKey, value);
            }
        }
    }

    /**
     * Convert flat map back to nested object
     * @param {Map} flatMap - Flat map with dot notation keys
     * @returns {Object} Nested object
     */
    unflattenMap(flatMap) {
        const result = {};
        
        for (const [key, value] of flatMap) {
            const parts = key.split('.');
            let current = result;
            
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            
            current[parts[parts.length - 1]] = value;
        }
        
        return result;
    }

    /**
     * Validate settings against schema
     * @param {Object} settings - Settings to validate
     * @returns {Object} Validation result
     */
    validate(settings) {
        const errors = [];
        const warnings = [];
        
        // Validate required settings
        const required = ['iobroker.url'];
        for (const key of required) {
            if (!this.has(key)) {
                errors.push(`Missing required setting: ${key}`);
            }
        }
        
        // Validate URL format
        const url = this.get('iobroker.url');
        if (url && typeof url === 'string') {
            try {
                new URL(url);
            } catch {
                errors.push('iobroker.url must be a valid URL');
            }
        }
        
        // Validate theme
        const themeName = this.get('theme.name');
        if (themeName && !this.getThemeNames().includes(themeName)) {
            warnings.push(`Unknown theme: ${themeName}. Available: ${this.getThemeNames().join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Export current configuration for backup
     * @returns {Object} Configuration backup
     */
    exportConfig() {
        return {
            timestamp: new Date().toISOString(),
            persistent: this.unflattenMap(this.persistentConfig),
            runtime: this.unflattenMap(this.runtimeConfig)
        };
    }

    /**
     * Import configuration from backup
     * @param {Object} backup - Configuration backup
     */
    async importConfig(backup) {
        if (backup.persistent) {
            this.persistentConfig.clear();
            this.flattenObject(backup.persistent, '', this.persistentConfig);
            await this.savePersistentConfig();
        }
        
        if (backup.runtime) {
            this.runtimeConfig.clear();
            this.flattenObject(backup.runtime, '', this.runtimeConfig);
        }
        
        this.emit('imported', backup);
    }

    /**
     * Reset to defaults
     * @param {boolean} persistent - Whether to clear persistent storage
     */
    async reset(persistent = false) {
        this.runtimeConfig.clear();
        
        if (persistent) {
            this.persistentConfig.clear();
            await this.savePersistentConfig();
        }
        
        this.emit('reset', { persistent });
    }
}

export default UnifiedSettingsManager;