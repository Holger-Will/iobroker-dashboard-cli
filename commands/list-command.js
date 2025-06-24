import { BaseCommand } from './base-command.js';

export class ListCommand extends BaseCommand {
    get name() {
        return 'list';
    }

    get aliases() {
        return ['ls'];
    }

    get description() {
        return 'List dashboard components';
    }

    get usage() {
        return 'list [-g] [-e] [-c] [groupname]';
    }

    get examples() {
        return [
            'list              # List all groups',
            'ls -g             # List groups only',  
            'ls -e             # List all elements',
            'ls -c             # List saved configurations',
            'ls -eg Solar      # List elements in "Solar" group',
            'ls Temperatures   # List elements in "Temperatures" group'
        ];
    }

    async run(args) {
        const parsed = this.parseArgs(args);
        const hasGroupFlag = parsed.flags.has('g');
        const hasElementFlag = parsed.flags.has('e');
        const hasConfigFlag = parsed.flags.has('c');
        const groupName = parsed.params[0];

        try {
            // List configurations
            if (hasConfigFlag) {
                await this.listConfigurations();
                return;
            }

            // List elements in specific group
            if (groupName) {
                await this.listGroupElements(groupName);
                return;
            }

            // List all elements across all groups
            if (hasElementFlag && !hasGroupFlag) {
                await this.listAllElements();
                return;
            }

            // List groups (default behavior, or with -g flag)
            if (!hasElementFlag || hasGroupFlag) {
                await this.listGroups();
            }

            // Also list elements if both flags present
            if (hasElementFlag && hasGroupFlag) {
                this.info(''); // Empty line separator
                await this.listAllElements();
            }

        } catch (error) {
            this.error(`Error listing: ${error.message}`);
        }
    }

    async listGroups() {
        try {
            const groups = this.tools.listGroups();
            
            if (!groups || groups.length === 0) {
                this.info('No groups created yet. Use "add-group <name>" to create one.');
                return;
            }

            this.info('📁 Dashboard Groups:');
            groups.forEach((group, index) => {
                this.info(`  ${index + 1}. ${group.title} (${group.elementCount} elements)`);
            });
        } catch (error) {
            this.error(`Error listing groups: ${error.message}`);
        }
    }

    async listAllElements() {
        const result = this.tools.listElements();
        
        if (!result.success) {
            this.error(`Failed to list elements: ${result.error}`);
            return;
        }

        if (result.elements.length === 0) {
            this.info('No elements created yet. Use "add-*" commands to create elements.');
            return;
        }

        this.info('🔧 All Dashboard Elements:');
        
        // Group elements by their group
        const elementsByGroup = {};
        result.elements.forEach(element => {
            if (!elementsByGroup[element.groupTitle]) {
                elementsByGroup[element.groupTitle] = [];
            }
            elementsByGroup[element.groupTitle].push(element);
        });

        Object.entries(elementsByGroup).forEach(([groupTitle, elements]) => {
            this.info(`  📁 ${groupTitle}:`);
            elements.forEach((element, index) => {
                const valueText = element.value !== undefined ? ` = ${element.value}` : '';
                this.info(`    ${index + 1}. ${element.caption} (${element.type})${valueText}`);
                this.info(`       ↳ ${element.stateId}`);
            });
        });
    }

    async listGroupElements(groupName) {
        const groups = this.tools.listGroups();
        const group = groups.find(g => 
            g.title.toLowerCase().includes(groupName.toLowerCase()) || 
            g.id === groupName
        );

        if (!group) {
            this.error(`Group not found: ${groupName}`);
            this.info('Available groups:');
            groups.forEach(g => this.info(`  - ${g.title}`));
            return;
        }

        if (group.elements.length === 0) {
            this.info(`Group "${group.title}" has no elements.`);
            this.info('Use add-* commands to add elements to this group.');
            return;
        }

        this.info(`🔧 Elements in "${group.title}":`);
        group.elements.forEach((element, index) => {
            const valueText = element.value !== undefined ? ` = ${element.value}` : '';
            this.info(`  ${index + 1}. ${element.caption} (${element.type})${valueText}`);
            this.info(`     ↳ ${element.stateId}`);
        });
    }

    async listConfigurations() {
        const result = await this.tools.listLayouts();
        
        if (!result.success) {
            this.error(`Failed to list configurations: ${result.error}`);
            return;
        }

        if (result.configs.length === 0) {
            this.info('No saved configurations found.');
            return;
        }

        this.info('💾 Saved Configurations:');
        result.configs.forEach(config => {
            const date = new Date(config.updated || config.created).toLocaleString();
            this.info(`  📄 ${config.filename}`);
            this.info(`     ${config.groupCount} groups, ${config.elementCount} elements`);
            this.info(`     Updated: ${date}`);
        });
    }
}

export default ListCommand;