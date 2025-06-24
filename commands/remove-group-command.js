import { BaseCommand } from './base-command.js';

export class RemoveGroupCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'remove-group';
    }

    get aliases() {
        return ['rm-group', 'delete-group'];
    }

    get description() {
        return 'Remove a group and all its elements';
    }

    get usage() {
        return 'remove-group [number] [confirm]';
    }

    get examples() {
        return [
            'remove-group',
            'remove-group 2',
            'remove-group 2 confirm'
        ];
    }

    async execute(args) {
        const allGroups = this.dashboard.tools.listGroups();
        
        if (allGroups.length === 0) {
            this.dashboard.addInfoMessage('No groups to remove.');
            return;
        }
        
        if (args.length < 1) {
            // Show numbered list of groups
            this.dashboard.addInfoMessage('Available groups:');
            allGroups.forEach((group, index) => {
                this.dashboard.addInfoMessage(`  ${index + 1}. ${group.title} (${group.elementCount} elements)`);
            });
            this.dashboard.addInfoMessage('Use: remove-group <number>');
        } else {
            // Remove specific group
            const groupNumber = parseInt(args[0]);
            if (isNaN(groupNumber) || groupNumber < 1 || groupNumber > allGroups.length) {
                this.dashboard.addErrorMessage(`Invalid group number. Choose 1-${allGroups.length}`);
                return;
            }
            
            const groupToRemove = allGroups[groupNumber - 1];
            
            if (groupToRemove.elementCount > 0) {
                this.dashboard.addWarningMessage(`Group "${groupToRemove.title}" contains ${groupToRemove.elementCount} elements.`);
                this.dashboard.addInfoMessage('Use: remove-group <number> confirm - to remove group with all elements');
                
                if (args[1] !== 'confirm') {
                    return;
                }
            }
            
            const removeGroupResult = groupToRemove.elementCount > 0 
                ? await this.dashboard.tools.removeGroupWithElements(groupToRemove.id)
                : await this.dashboard.tools.removeGroup(groupToRemove.id);
            
            if (removeGroupResult.success) {
                this.dashboard.addSuccessMessage(`Removed group: ${groupToRemove.title}`);
                // Reload dashboard to ensure proper rendering after removal
                const reloadResult = await this.dashboard.configManager.load();
                if (reloadResult.success) {
                    this.dashboard.connectElementsToClient();
                    this.dashboard.renderDashboard();
                }
            } else {
                this.dashboard.addErrorMessage(`Failed to remove group: ${removeGroupResult.error}`);
            }
        }
    }
}

export default RemoveGroupCommand;