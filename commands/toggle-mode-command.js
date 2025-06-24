import { BaseCommand } from './base-command.js';

export class ToggleModeCommand extends BaseCommand {
    get name() {
        return 'tm';
    }

    get aliases() {
        return ['toggle-mode', 'mode'];
    }

    get description() {
        return 'Toggle between dashboard and command mode';
    }

    get usage() {
        return '/tm';
    }

    get examples() {
        return [
            '/tm',
            '/toggle-mode',
            '/mode'
        ];
    }

    async run(parsedArgs) {
        // Toggle command mode
        this.dashboard.commandMode = !this.dashboard.commandMode;
        
        // Force complete re-render when switching modes
        this.dashboard.renderer.initialized = false;
        this.dashboard.renderer.elementPositions.clear();
        
        this.dashboard.updatePrompt();
        this.dashboard.renderDashboard();
        
        const modeText = this.dashboard.commandMode ? 'Command Mode (full screen output)' : 'Dashboard Mode';
        this.success(`[MODE] Switched to ${modeText}`);
        this.info('[TIP] Tip: Press ESC to toggle modes quickly');
    }
}

export default ToggleModeCommand;