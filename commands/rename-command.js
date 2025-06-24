import { BaseCommand } from './base-command.js';

export class RenameCommand extends BaseCommand {
    get name() {
        return 'rename';
    }

    get aliases() {
        return ['rn'];
    }

    get description() {
        return 'Rename groups or elements with smart polymorphic targeting';
    }

    get usage() {
        return '/rename -o <old-name> -n <new-name> [-g <group>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['o', 'n', 'g', 'h'],
            flags: {
                o: { type: 'any', required: true, description: 'Old name of group or element to rename (string or number)' },
                n: { type: 'string', required: true, description: 'New name to assign' },
                g: { type: 'any', description: 'Group name (for element context). If omitted, treats as group mode. If present without value, searches all groups for element.' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/rename -o "Solar System" -n "Energy Management"  # Rename group',
            '/rename -o "PV Power" -n "Solar Production" -g "Solar"  # Rename element in group',
            '/rename -o "Battery" -n "Energy Storage" -g  # Search all groups for element',
            '/rn -o "Temp1" -n "Living Room Temp" -g "Sensors"'
        ];
    }

    async run(parsedArgs) {
        const oldName = String(parsedArgs.getFlag('o')); // Convert to string
        const newName = parsedArgs.getFlag('n');
        const groupContext = parsedArgs.getFlag('g');
        const hasGroupFlag = parsedArgs.hasFlag('g');

        // Determine operation mode based on flag usage
        if (!hasGroupFlag) {
            // No -g flag = group mode
            await this.renameGroup(oldName, newName);
        } else if (groupContext === true || groupContext === '' || groupContext === null || groupContext === undefined) {
            // -g flag with no value = search all groups for element
            await this.renameElementGlobal(oldName, newName);
        } else {
            // -g flag with value = rename element in specific group
            await this.renameElementInGroup(oldName, newName, String(groupContext));
        }
    }

    async renameGroup(oldName, newName) {
        try {
            const groups = this.dashboard.tools.listGroups();
            
            // Find group by name or partial match
            const targetGroup = this.findGroupByName(groups, oldName);
            
            if (!targetGroup) {
                this.error(`Group not found: "${oldName}"`);
                this.showAvailableGroups(groups);
                return;
            }

            // Check if new name already exists
            const existingGroup = groups.find(g => 
                g.title.toLowerCase() === newName.toLowerCase() && 
                g.id !== targetGroup.id
            );
            
            if (existingGroup) {
                this.error(`A group named "${newName}" already exists`);
                return;
            }

            // Perform rename
            const result = await this.dashboard.tools.renameGroup(targetGroup.id, newName);

            if (result.success) {
                this.success(`[RENAMED] Renamed group: "${result.oldTitle}" → "${result.newTitle}"`);
                this.forceRerender();
            } else {
                this.error(`Failed to rename group: ${result.error}`);
            }

        } catch (error) {
            this.error(`Error renaming group: ${error.message}`);
        }
    }

    async renameElementInGroup(oldName, newName, groupName) {
        try {
            const groups = this.dashboard.tools.listGroups();
            
            // Find the target group
            const targetGroup = this.findGroupByName(groups, groupName);
            
            if (!targetGroup) {
                this.error(`Group not found: "${groupName}"`);
                this.showAvailableGroups(groups);
                return;
            }

            // Find element in the group
            const targetElement = this.findElementInGroup(targetGroup, oldName);
            
            if (!targetElement) {
                this.error(`Element not found in group "${targetGroup.title}": "${oldName}"`);
                this.showElementsInGroup(targetGroup);
                return;
            }

            // Check if new name already exists in the group
            const existingElement = targetGroup.elements.find(e => 
                e.caption.toLowerCase() === newName.toLowerCase() && 
                e.id !== targetElement.id
            );
            
            if (existingElement) {
                this.error(`An element named "${newName}" already exists in group "${targetGroup.title}"`);
                return;
            }

            // Perform rename
            const result = await this.dashboard.tools.renameElement(targetGroup.id, targetElement.id, newName);

            if (result.success) {
                this.success(`[RENAMED] Renamed element in "${targetGroup.title}": "${result.oldCaption}" → "${result.newCaption}"`);
                this.forceRerender();
            } else {
                this.error(`Failed to rename element: ${result.error}`);
            }

        } catch (error) {
            this.error(`Error renaming element: ${error.message}`);
        }
    }

    async renameElementGlobal(oldName, newName) {
        try {
            const groups = this.dashboard.tools.listGroups();
            const matches = [];

            // Search all groups for elements with matching names
            for (const group of groups) {
                const element = this.findElementInGroup(group, oldName);
                if (element) {
                    matches.push({ group, element });
                }
            }

            if (matches.length === 0) {
                this.error(`Element not found in any group: "${oldName}"`);
                this.showAllElements(groups);
                return;
            }

            if (matches.length > 1) {
                this.warning(`Multiple elements found with name "${oldName}":`);
                matches.forEach((match, index) => {
                    this.info(`  ${index + 1}. "${match.element.caption}" in group "${match.group.title}"`);
                });
                this.info('');
                this.info('Please specify the group with: /rename -o "name" -n "new" -g "group"');
                return;
            }

            // Single match found
            const { group, element } = matches[0];

            // Check if new name already exists in the group
            const existingElement = group.elements.find(e => 
                e.caption.toLowerCase() === newName.toLowerCase() && 
                e.id !== element.id
            );
            
            if (existingElement) {
                this.error(`An element named "${newName}" already exists in group "${group.title}"`);
                return;
            }

            // Perform rename
            const result = await this.dashboard.tools.renameElement(group.id, element.id, newName);

            if (result.success) {
                this.success(`[RENAMED] Renamed element in "${group.title}": "${result.oldCaption}" → "${result.newCaption}"`);
                this.forceRerender();
            } else {
                this.error(`Failed to rename element: ${result.error}`);
            }

        } catch (error) {
            this.error(`Error renaming element: ${error.message}`);
        }
    }

    findGroupByName(groups, name) {
        // Exact match first
        let group = groups.find(g => g.title.toLowerCase() === name.toLowerCase());
        if (group) return group;

        // Partial match
        group = groups.find(g => g.title.toLowerCase().includes(name.toLowerCase()));
        if (group) return group;

        // Number match (1-based index)
        const groupNumber = parseInt(name);
        if (!isNaN(groupNumber) && groupNumber >= 1 && groupNumber <= groups.length) {
            return groups[groupNumber - 1];
        }

        return null;
    }

    findElementInGroup(group, name) {
        // Exact match first
        let element = group.elements.find(e => e.caption.toLowerCase() === name.toLowerCase());
        if (element) return element;

        // Partial match
        element = group.elements.find(e => e.caption.toLowerCase().includes(name.toLowerCase()));
        if (element) return element;

        // Number match (1-based index)
        const elementNumber = parseInt(name);
        if (!isNaN(elementNumber) && elementNumber >= 1 && elementNumber <= group.elements.length) {
            return group.elements[elementNumber - 1];
        }

        return null;
    }

    showAvailableGroups(groups) {
        if (groups.length === 0) {
            this.info('No groups available. Create one with: /add -c -g "Group Name"');
        } else {
            this.info('Available groups:');
            groups.forEach((group, index) => {
                this.info(`  ${index + 1}. "${group.title}" (${group.elements.length} elements)`);
            });
        }
    }

    showElementsInGroup(group) {
        if (group.elements.length === 0) {
            this.info(`No elements in group "${group.title}"`);
        } else {
            this.info(`Elements in group "${group.title}":`);
            group.elements.forEach((element, index) => {
                this.info(`  ${index + 1}. "${element.caption}" (${element.type})`);
            });
        }
    }

    showAllElements(groups) {
        let totalElements = 0;
        
        this.info('All elements in dashboard:');
        groups.forEach(group => {
            if (group.elements.length > 0) {
                this.info(`  Group "${group.title}":`);
                group.elements.forEach((element, index) => {
                    this.info(`    ${index + 1}. "${element.caption}" (${element.type})`);
                    totalElements++;
                });
            }
        });

        if (totalElements === 0) {
            this.info('  No elements found. Add one with: /add -g "Group" -n "Name" -s state.id');
        }
    }

    forceRerender() {
        // Force complete re-render to show the new name
        this.dashboard.renderer.initialized = false;
        this.dashboard.renderer.elementPositions.clear();
        this.render();
    }
}

export default RenameCommand;