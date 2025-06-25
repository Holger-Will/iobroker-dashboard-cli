import { BaseCommand } from './base-command.js';

export class HotkeyCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'hotkey';
    }

    get aliases() {
        return ['hk'];
    }

    get description() {
        return 'Assign dashboards to hotkeys (Alt+0-9)';
    }

    get usage() {
        return '/hotkey [-n <0-9>] [-f <filename>] [-l] [-c <0-9>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['n', 'f', 'l', 'c', 'h'],
            flags: {
                n: { type: 'number', description: 'Hotkey number (0-9)' },
                f: { type: 'string', description: 'Dashboard filename to assign' },
                l: { type: 'boolean', description: 'List current hotkey assignments' },
                c: { type: 'number', description: 'Clear hotkey assignment (0-9)' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/hotkey -l',
            '/hotkey -n 1 -f solar-dashboard.json',
            '/hotkey -n 3 -f system-status.json',
            '/hotkey -c 1'
        ];
    }

    async run(parsedArgs) {
        if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'connection') {
            this.error('Please complete connection setup first. Use "/test -c" or skip connection.');
            return;
        }

        // Handle list operation
        if (parsedArgs.hasFlag('l')) {
            await this.listHotkeys();
            return;
        }

        // Handle clear operation
        if (parsedArgs.hasFlag('c')) {
            const hotkeyNumber = parsedArgs.getFlag('c');
            await this.clearHotkey(hotkeyNumber);
            return;
        }

        // Handle assignment operation
        if (parsedArgs.hasFlag('n')) {
            const hotkeyNumber = parsedArgs.getFlag('n');
            const filename = parsedArgs.getFlag('f'); // Optional
            await this.assignHotkey(hotkeyNumber, filename);
            return;
        }

        // Show usage if no valid operation
        this.showUsage();
    }

    async listHotkeys() {
        try {
            const settings = await this.dashboard.configManager.loadSettings();
            const hotkeys = settings.hotkeys || {};
            
            this.info('Current hotkey assignments:');
            this.info('');
            
            let hasAssignments = false;
            for (let i = 0; i <= 9; i++) {
                const key = i.toString();
                if (hotkeys[key]) {
                    this.info(`  Alt+${key} → ${hotkeys[key]}`);
                    hasAssignments = true;
                } else {
                    this.info(`  Alt+${key} → [not assigned]`);
                }
            }
            
            if (!hasAssignments) {
                this.info('');
                this.info('[TIP] Use /hotkey -n <number> to assign current dashboard');
                this.info('[TIP] Use /hotkey -n <number> -f <filename> to assign specific dashboard');
                this.info('[TIP] Example: /hotkey -n 1 (assigns current dashboard)');
            }
        } catch (error) {
            this.error(`Failed to load hotkey settings: ${error.message}`);
        }
    }

    async assignHotkey(hotkeyNumber, filename) {
        // Validate hotkey number
        if (typeof hotkeyNumber !== 'number' || hotkeyNumber < 0 || hotkeyNumber > 9) {
            this.error('Hotkey number must be 0-9');
            return;
        }

        // If no filename provided, use currently open dashboard
        if (!filename) {
            filename = await this.dashboard.configManager.getDefaultDashboard();
            if (!filename) {
                this.error('No dashboard currently loaded and no filename specified');
                this.info('Either load a dashboard first or use: /hotkey -n <number> -f <filename>');
                return;
            }
            this.info(`Using currently open dashboard: ${filename}`);
        }

        // Check if dashboard file exists
        const configs = await this.dashboard.configManager.listConfigs();
        if (!configs.success) {
            this.error(`Failed to list configurations: ${configs.error}`);
            return;
        }

        const dashboardExists = configs.configs.some(config => config.filename === filename);
        if (!dashboardExists) {
            this.error(`Dashboard file not found: ${filename}`);
            this.info('Available dashboards:');
            configs.configs.forEach(config => {
                this.info(`  - ${config.filename}`);
            });
            return;
        }

        try {
            // Load current settings
            const settings = await this.dashboard.configManager.loadSettings();
            
            // Initialize hotkeys object if it doesn't exist
            if (!settings.hotkeys) {
                settings.hotkeys = {};
            }

            // Check if filename is already assigned to another hotkey
            const existingHotkey = Object.keys(settings.hotkeys).find(key => settings.hotkeys[key] === filename);
            if (existingHotkey && existingHotkey !== hotkeyNumber) {
                this.warning(`Dashboard "${filename}" was already assigned to Alt+${existingHotkey}`);
                this.info(`Reassigning from Alt+${existingHotkey} to Alt+${hotkeyNumber}`);
                delete settings.hotkeys[existingHotkey];
            }

            // Assign the hotkey
            const oldAssignment = settings.hotkeys[hotkeyNumber];
            settings.hotkeys[hotkeyNumber] = filename;
            
            // Save settings
            const saveResult = await this.dashboard.configManager.saveSettings(settings);
            if (saveResult.success) {
                if (oldAssignment) {
                    this.success(`Reassigned Alt+${hotkeyNumber}: "${oldAssignment}" → "${filename}"`);
                } else {
                    this.success(`Assigned Alt+${hotkeyNumber} → "${filename}"`);
                }
                this.info('[TIP] Press Alt+' + hotkeyNumber + ' to quickly load this dashboard');
            } else {
                this.error(`Failed to save hotkey assignment: ${saveResult.error}`);
            }
        } catch (error) {
            this.error(`Failed to assign hotkey: ${error.message}`);
        }
    }

    async clearHotkey(hotkeyNumber) {
        // Validate hotkey number
        if (typeof hotkeyNumber !== 'number' || hotkeyNumber < 0 || hotkeyNumber > 9) {
            this.error('Hotkey number must be 0-9');
            return;
        }

        try {
            // Load current settings
            const settings = await this.dashboard.configManager.loadSettings();
            
            if (!settings.hotkeys || !settings.hotkeys[hotkeyNumber]) {
                this.warning(`Alt+${hotkeyNumber} is not currently assigned`);
                return;
            }

            const oldAssignment = settings.hotkeys[hotkeyNumber];
            delete settings.hotkeys[hotkeyNumber];
            
            // Save settings
            const saveResult = await this.dashboard.configManager.saveSettings(settings);
            if (saveResult.success) {
                this.success(`Cleared Alt+${hotkeyNumber} (was "${oldAssignment}")`);
            } else {
                this.error(`Failed to clear hotkey: ${saveResult.error}`);
            }
        } catch (error) {
            this.error(`Failed to clear hotkey: ${error.message}`);
        }
    }

    showUsage() {
        this.info('Hotkey command usage:');
        this.info('');
        this.info('List assignments:');
        this.info('  /hotkey -l');
        this.info('');
        this.info('Assign dashboard to hotkey:');
        this.info('  /hotkey -n <0-9>               (current dashboard)');
        this.info('  /hotkey -n <0-9> -f <filename> (specific dashboard)');
        this.info('');
        this.info('Clear hotkey assignment:');
        this.info('  /hotkey -c <0-9>');
        this.info('');
        this.info('Examples:');
        this.examples.forEach(example => {
            this.info(`  ${example}`);
        });
    }
}

export default HotkeyCommand;