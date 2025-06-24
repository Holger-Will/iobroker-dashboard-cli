import { BaseCommand } from './base-command.js';

export class RemoveElementCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'remove-element';
    }

    get aliases() {
        return ['rm-el', 'delete-element'];
    }

    get description() {
        return 'Remove an element from a group';
    }

    get usage() {
        return 'remove-element <group> [number]';
    }

    get examples() {
        return [
            'remove-element "Living Room"',
            'remove-element "Solar System" 2'
        ];
    }

    async execute(args) {
        if (args.length < 1) {
            this.dashboard.addErrorMessage('Usage: remove-element <group> [number]');
            return;
        }
        
        const targetGroupForRemoval = args[0];
        const availableGroups = this.dashboard.tools.listGroups();
        const groupForRemoval = availableGroups.find(g => 
            g.title.toLowerCase().includes(targetGroupForRemoval.toLowerCase()) || 
            g.id === targetGroupForRemoval
        );
        
        if (!groupForRemoval) {
            this.dashboard.addErrorMessage(`Group not found: ${targetGroupForRemoval}`);
            return;
        }
        
        if (groupForRemoval.elements.length === 0) {
            this.dashboard.addInfoMessage(`Group "${groupForRemoval.title}" has no elements to remove.`);
            return;
        }
        
        if (args.length < 2) {
            // Show numbered list of elements
            this.dashboard.addInfoMessage(`Elements in group "${groupForRemoval.title}":`);
            groupForRemoval.elements.forEach((element, index) => {
                this.dashboard.addInfoMessage(`  ${index + 1}. ${element.caption} (${element.type}) - ${element.stateId}`);
            });
            this.dashboard.addInfoMessage('Use: remove-element <group> <number>');
        } else {
            // Remove specific element
            const elementNumber = parseInt(args[1]);
            if (isNaN(elementNumber) || elementNumber < 1 || elementNumber > groupForRemoval.elements.length) {
                this.dashboard.addErrorMessage(`Invalid element number. Choose 1-${groupForRemoval.elements.length}`);
                return;
            }
            
            const elementToRemove = groupForRemoval.elements[elementNumber - 1];
            const removeResult = await this.dashboard.tools.removeElement(groupForRemoval.id, elementToRemove.id);
            
            if (removeResult.success) {
                this.dashboard.addSuccessMessage(`Removed element: ${elementToRemove.caption}`);
                // Reload dashboard to ensure proper rendering after removal
                const reloadResult = await this.dashboard.configManager.load();
                if (reloadResult.success) {
                    this.dashboard.connectElementsToClient();
                    this.dashboard.renderDashboard();
                }
            } else {
                this.dashboard.addErrorMessage(`Failed to remove element: ${removeResult.error}`);
            }
        }
    }
}

export default RemoveElementCommand;