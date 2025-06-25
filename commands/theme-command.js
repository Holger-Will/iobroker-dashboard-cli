import { BaseCommand } from './base-command.js';
import { 
    applyTheme, 
    getAvailableSchemes, 
    getCurrentTheme, 
    getAllThemes,
    saveCurrentThemeAs,
    deleteCustomTheme,
    exportCustomThemes,
    importCustomThemes
} from '../colors.js';
import { UnifiedSettingsManager } from '../unified-settings-manager.js';

export class ThemeCommand extends BaseCommand {
    get name() {
        return 'theme';
    }

    get aliases() {
        return ['color', 'scheme'];
    }

    get description() {
        return 'Switch color themes or list available themes';
    }

    get usage() {
        return '/theme [-l] [-s <scheme>] [--save <name>] [--delete <name>] [--export] [--import <file>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['l', 's', 'h', 'save', 'delete', 'export', 'import'],
            flags: {
                l: { type: 'boolean', description: 'List available themes' },
                s: { type: 'string', description: 'Set color scheme (built-in or custom)' },
                save: { type: 'string', description: 'Save current theme as custom theme' },
                delete: { type: 'string', description: 'Delete a custom theme' },
                export: { type: 'boolean', description: 'Export all custom themes to JSON' },
                import: { type: 'string', description: 'Import custom themes from JSON file' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/theme -l',
            '/theme -s dark',
            '/theme -s matrix',
            '/theme --save my-custom-theme',
            '/theme --delete old-theme',
            '/theme --export',
            '/theme --import themes.json'
        ];
    }

    async run(parsedArgs) {
        // Export themes
        if (parsedArgs.hasFlag('export')) {
            await this.exportThemes();
            return;
        }

        // Import themes
        if (parsedArgs.hasFlag('import')) {
            const filename = parsedArgs.getFlag('import');
            await this.importThemes(filename);
            return;
        }

        // Save current theme
        if (parsedArgs.hasFlag('save')) {
            const themeName = parsedArgs.getFlag('save');
            await this.saveTheme(themeName);
            return;
        }

        // Delete custom theme
        if (parsedArgs.hasFlag('delete')) {
            const themeName = parsedArgs.getFlag('delete');
            await this.deleteTheme(themeName);
            return;
        }

        // List available themes
        if (parsedArgs.hasFlag('l')) {
            await this.listThemes();
            return;
        }

        // Set theme
        if (parsedArgs.hasFlag('s')) {
            const schemeName = parsedArgs.getFlag('s');
            await this.setTheme(schemeName);
            return;
        }

        // No flags - show current theme and available options
        await this.showCurrentTheme();
    }

    async listThemes() {
        const allThemes = getAllThemes();
        const currentTheme = getCurrentTheme();
        
        this.info('[THEMES] Available Color Themes:');
        this.info('');
        
        // Built-in themes
        this.info('[BUILTIN] Built-in Themes:');
        allThemes.builtin.forEach(scheme => {
            const description = this.getThemeDescription(scheme);
            const current = scheme === currentTheme ? ' (current)' : '';
            this.info(`  ${scheme.padEnd(10)} - ${description}${current}`);
        });
        
        // Custom themes
        if (allThemes.custom.length > 0) {
            this.info('');
            this.info('[CUSTOM] Custom Themes:');
            allThemes.custom.forEach(scheme => {
                const current = scheme === currentTheme ? ' (current)' : '';
                this.info(`  ${scheme.padEnd(10)} - Custom theme${current}`);
            });
        }
        
        this.info('');
        this.info('[TIP] Use: /theme -s <name> to switch themes');
        this.info('[TIP] Use: /theme --save <name> to save current theme as custom');
    }

    async setTheme(schemeName) {
        const success = applyTheme(schemeName);
        
        if (success) {
            this.success(`[THEME] Applied theme: ${schemeName}`);
            
            // Save theme selection persistently
            try {
                const settings = new UnifiedSettingsManager();
                await settings.initialize();
                await settings.set('theme.name', schemeName, true); // persistent=true
                this.info(`[THEME] Saved theme selection: ${schemeName}`);
            } catch (error) {
                this.warning(`[THEME] Failed to save theme setting: ${error.message}`);
            }
            
            // Force complete re-render to apply new colors
            this.dashboard.renderer.initialized = false;
            this.dashboard.renderer.elementPositions.clear();
            
            this.render();
            
            this.info('[TIP] Theme applied immediately and saved for next startup.');
        } else {
            this.error(`Unknown theme: ${schemeName}`);
            this.info('Use /theme -l to see available themes');
        }
    }

    async saveTheme(themeName) {
        try {
            saveCurrentThemeAs(themeName);
            this.success(`[SAVED] Saved current theme as: ${themeName}`);
            this.info('[TIP] Use /theme -s ' + themeName + ' to apply this theme later');
        } catch (error) {
            this.error(`Failed to save theme: ${error.message}`);
        }
    }

    async deleteTheme(themeName) {
        const deleted = deleteCustomTheme(themeName);
        
        if (deleted) {
            this.success(`[DELETED] Deleted custom theme: ${themeName}`);
            
            // If current theme was deleted, switch to default
            if (getCurrentTheme() === themeName) {
                await this.setTheme('default');
                this.info('[TIP] Switched to default theme since deleted theme was active');
            }
        } else {
            this.error(`Theme not found: ${themeName}`);
            this.info('Use /theme -l to see available custom themes');
        }
    }

    async exportThemes() {
        try {
            const json = exportCustomThemes();
            this.info('[EXPORT] Custom themes export:');
            this.info('');
            this.info(json);
            this.info('');
            this.info('[TIP] Copy this JSON to save your custom themes');
        } catch (error) {
            this.error(`Export failed: ${error.message}`);
        }
    }

    async importThemes(filename) {
        try {
            // For now, we'll expect the user to provide JSON directly
            // In a full implementation, we'd read from the file
            this.info('[IMPORT] Theme import functionality');
            this.info('[TIP] For now, manually call importCustomThemes() with JSON data');
            this.error('File import not yet implemented - use direct JSON import');
        } catch (error) {
            this.error(`Import failed: ${error.message}`);
        }
    }

    async showCurrentTheme() {
        const currentTheme = getCurrentTheme();
        const allThemes = getAllThemes();
        
        this.info('[THEMES] Theme Management:');
        this.info('');
        this.info(`[CURRENT] Current theme: ${currentTheme}`);
        this.info('');
        this.info('Available commands:');
        this.info('  /theme -l              List all themes');
        this.info('  /theme -s <name>       Switch to theme');
        this.info('  /theme --save <name>   Save current as custom theme');
        this.info('  /theme --delete <name> Delete custom theme');
        this.info('  /theme --export        Export custom themes');
        this.info('');
        
        // Show summary
        this.info(`[BUILTIN] Built-in themes: ${allThemes.builtin.length}`);
        this.info(`[CUSTOM] Custom themes: ${allThemes.custom.length}`);
        
        if (allThemes.custom.length > 0) {
            this.info('');
            this.info('Custom themes: ' + allThemes.custom.join(', '));
        }
    }

    getThemeDescription(scheme) {
        const descriptions = {
            default: 'Classic blue/green theme with rounded borders',
            dark: 'High contrast dark theme with bright colors',
            light: 'Light theme with dark text on light background',
            matrix: 'Green matrix-style theme with thick borders',
            retro: 'Orange/brown retro theme with double borders',
            ocean: 'Blue/cyan ocean theme with flowing colors'
        };
        
        return descriptions[scheme] || 'Custom color scheme';
    }
}

export default ThemeCommand;