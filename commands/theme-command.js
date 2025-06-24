import { BaseCommand } from './base-command.js';
import { applyColorScheme, getAvailableSchemes } from '../colors.js';

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
        return '/theme [-l] [-s <scheme>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['l', 's', 'h'],
            flags: {
                l: { type: 'boolean', description: 'List available themes' },
                s: { type: 'string', enum: getAvailableSchemes(), description: 'Set color scheme' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/theme -l',
            '/theme -s dark',
            '/theme -s matrix',
            '/theme -s retro'
        ];
    }

    async run(parsedArgs) {
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
        const schemes = getAvailableSchemes();
        
        this.info('🎨 Available Color Themes:');
        this.info('');
        
        schemes.forEach(scheme => {
            const description = this.getThemeDescription(scheme);
            this.info(`  ${scheme.padEnd(10)} - ${description}`);
        });
        
        this.info('');
        this.info('💡 Use: /theme -s <name> to switch themes');
    }

    async setTheme(schemeName) {
        const success = applyColorScheme(schemeName);
        
        if (success) {
            this.success(`🎨 Applied theme: ${schemeName}`);
            
            // Force complete re-render to apply new colors
            this.dashboard.renderer.initialized = false;
            this.dashboard.renderer.elementPositions.clear();
            
            this.render();
            
            this.info('💡 Theme applied immediately. Colors will be visible on next render.');
        } else {
            this.error(`Unknown theme: ${schemeName}`);
            this.info('Use /theme -l to see available themes');
        }
    }

    async showCurrentTheme() {
        // Since we don't track current theme name, show all available themes
        this.info('🎨 Theme Management:');
        this.info('');
        this.info('Available commands:');
        this.info('  /theme -l        List all themes');
        this.info('  /theme -s <name> Switch to theme');
        this.info('');
        
        await this.listThemes();
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