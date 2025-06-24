import { BaseCommand } from './base-command.js';

export class RenameGroupCommand extends BaseCommand {
    get name() {
        return 'rename-group';
    }

    get aliases() {
        return ['rg', 'rename'];
    }

    get description() {
        return 'Rename an existing group';
    }

    get usage() {
        return 'rename-group <group> <new-name>';
    }

    get examples() {
        return [
            'rename-group Solar "Solar System"',
            'rg 1 "Energy Management"',
            'rename "Old Name" "New Name"'
        ];
    }

    async run(args) {
        const parsed = this.parseArgs(args);
        
        if (parsed.params.length < 2) {
            this.showUsageHelp();
            return;
        }

        const [groupIdentifier, newName] = parsed.params;
        
        try {
            // Find the group by name or number
            const groups = this.tools.listGroups();
            let targetGroup = null;
            
            // Try to find by partial name match first
            targetGroup = groups.find(g => 
                g.title.toLowerCase().includes(groupIdentifier.toLowerCase()) || 
                g.id === groupIdentifier
            );
            
            // If not found, try to find by number (1-based index)
            if (!targetGroup) {
                const groupNumber = parseInt(groupIdentifier);
                if (!isNaN(groupNumber) && groupNumber >= 1 && groupNumber <= groups.length) {
                    targetGroup = groups[groupNumber - 1];
                }
            }

            if (!targetGroup) {
                this.error(`Group not found: ${groupIdentifier}`);
                this.showAvailableGroups(groups);
                return;
            }

            // Clean the new name
            const cleanNewName = newName.replace(/['"]/g, '');
            
            if (cleanNewName.length === 0) {
                this.error('New group name cannot be empty');
                return;
            }

            // Check if name already exists
            const existingGroup = groups.find(g => 
                g.title.toLowerCase() === cleanNewName.toLowerCase() && 
                g.id !== targetGroup.id
            );
            
            if (existingGroup) {
                this.error(`A group with name "${cleanNewName}" already exists`);
                return;
            }

            // Rename the group
            const result = await this.tools.renameGroup(targetGroup.id, cleanNewName);

            if (result.success) {
                this.success(`Renamed group "${result.oldTitle}" to "${result.newTitle}"`);
                
                // Force a complete re-render to show the new name
                this.dashboard.renderer.initialized = false;
                this.dashboard.renderer.elementPositions.clear();
                
                this.render();
            } else {
                this.error(`Failed to rename group: ${result.error}`);
            }

        } catch (error) {
            this.error(`Error renaming group: ${error.message}`);
        }
    }

    showUsageHelp() {
        this.error('Usage: rename-group <group> <new-name>');
        this.info('');
        this.info('Parameters:');
        this.info('  group     - Name of existing group, part of name, or number');
        this.info('  new-name  - New name for the group');
        this.info('');
        this.info('Examples:');
        this.examples.forEach(example => {
            this.info(`  ${example}`);
        });
        this.info('');
        
        const groups = this.tools.listGroups();
        this.showAvailableGroups(groups);
    }

    showAvailableGroups(groups) {
        if (groups.length === 0) {
            this.info('No groups available.');
        } else {
            this.info('Available groups:');
            groups.forEach((group, index) => {
                this.info(`  ${index + 1}. ${group.title} (${group.elementCount} elements)`);
            });
        }
    }
}

export default RenameGroupCommand;