import { BaseCommand } from './base-command.js';

export class LsCommand extends BaseCommand {
    get name() {
        return 'ls';
    }

    get aliases() {
        return ['list'];
    }

    get description() {
        return 'List dashboard components with modern flag syntax';
    }

    get usage() {
        return '/ls [-g] [-e <group>] [-c]';
    }

    get flagSchema() {
        return {
            knownFlags: ['g', 'e', 'c', 'h'],
            flags: {
                g: { type: 'boolean', description: 'List groups' },
                e: { type: 'string', description: 'List elements in specified group (or all if no group given)' },
                c: { type: 'boolean', description: 'List saved configurations' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/ls -g                    # List all groups',
            '/ls -e                   # List all elements',
            '/ls -e "Solar System"    # List elements in specific group',
            '/ls -c                   # List saved configurations',
            '/ls -g -e                # List both groups and elements'
        ];
    }

    async run(parsedArgs) {
        try {
            const hasGroups = parsedArgs.hasFlag('g');
            const hasElements = parsedArgs.hasFlag('e');
            const hasConfigs = parsedArgs.hasFlag('c');
            const groupName = parsedArgs.getFlag('e');

            // List configurations
            if (hasConfigs) {
                await this.listConfigurations();
                return;
            }

            // List elements in specific group
            if (hasElements && typeof groupName === 'string' && groupName.trim()) {
                await this.listGroupElements(groupName);
                return;
            }

            // List all elements across all groups
            if (hasElements && !hasGroups) {
                await this.listAllElements();
                return;
            }

            // List groups (default behavior, or with -g flag)
            if (!hasElements || hasGroups) {
                await this.listGroups();
            }

            // Also list elements if both flags present
            if (hasElements && hasGroups) {
                this.info(''); // Empty line separator
                await this.listAllElements();
            }

            // Default behavior when no flags given
            if (!hasGroups && !hasElements && !hasConfigs) {
                await this.listGroups();
            }

        } catch (error) {
            this.error(`Error listing: ${error.message}`);
        }
    }

    async listGroups() {
        try {
            const groups = this.dashboard.tools.listGroups();
            
            if (groups.length === 0) {
                this.warning('No groups found. Create one with: /add -c -g "Group Name"');
                return;
            }

            this.info('[GROUPS] Dashboard Groups:');
            this.info('');
            
            groups.forEach((group, index) => {
                const elementText = group.elements.length === 1 ? 'element' : 'elements';
                this.info(`  ${index + 1}. ${group.title} (${group.elements.length} ${elementText})`);
            });
            
            this.info('');
            this.info(`Total: ${groups.length} groups`);
        } catch (error) {
            this.error(`Error listing groups: ${error.message}`);
        }
    }

    async listAllElements() {
        try {
            const groups = this.dashboard.tools.listGroups();
            let totalElements = 0;

            this.info('[ELEMENTS] All Dashboard Elements:');
            this.info('');

            groups.forEach(group => {
                if (group.elements.length > 0) {
                    this.info(`  [GROUP] ${group.title}:`);
                    group.elements.forEach((element, index) => {
                        this.info(`    ${index + 1}. ${element.caption} (${element.type}) - ${element.stateId || 'no state'}`);
                        totalElements++;
                    });
                    this.info('');
                }
            });

            if (totalElements === 0) {
                this.warning('No elements found. Add one with: /add -g "Group" -n "Name" -s "state.id"');
            } else {
                this.info(`Total: ${totalElements} elements across ${groups.length} groups`);
            }
        } catch (error) {
            this.error(`Error listing elements: ${error.message}`);
        }
    }

    async listGroupElements(groupName) {
        try {
            const groups = this.dashboard.tools.listGroups();
            
            // Find group by name (exact match first, then partial)
            let targetGroup = groups.find(g => g.title.toLowerCase() === groupName.toLowerCase());
            if (!targetGroup) {
                targetGroup = groups.find(g => g.title.toLowerCase().includes(groupName.toLowerCase()));
            }

            if (!targetGroup) {
                this.error(`Group not found: "${groupName}"`);
                this.info('Available groups:');
                groups.forEach(g => this.info(`  - ${g.title}`));
                return;
            }

            this.info(`[ELEMENTS] Elements in "${targetGroup.title}":`);
            this.info('');

            if (targetGroup.elements.length === 0) {
                this.warning(`No elements in group "${targetGroup.title}"`);
                this.info(`Add one with: /add -g "${targetGroup.title}" -n "Name" -s "state.id"`);
            } else {
                targetGroup.elements.forEach((element, index) => {
                    this.info(`  ${index + 1}. ${element.caption} (${element.type}) - ${element.stateId || 'no state'}`);
                });
                this.info('');
                this.info(`Total: ${targetGroup.elements.length} elements`);
            }
        } catch (error) {
            this.error(`Error listing group elements: ${error.message}`);
        }
    }

    async listConfigurations() {
        try {
            const result = await this.dashboard.configManager.listConfigs();
            
            if (!result.success) {
                this.error(`Error listing configurations: ${result.error}`);
                return;
            }
            
            const configs = result.configs;
            
            if (configs.length === 0) {
                this.warning('No saved configurations found.');
                this.info('Save current dashboard with: /save -f "filename"');
                return;
            }

            this.info('[CONFIGS] Saved Configurations:');
            this.info('');
            
            configs.forEach((config, index) => {
                this.info(`  ${index + 1}. ${config.filename}`);
                if (config.created) {
                    this.info(`     Created: ${new Date(config.created).toLocaleString()}`);
                }
                if (config.updated) {
                    this.info(`     Updated: ${new Date(config.updated).toLocaleString()}`);
                }
                this.info(`     Groups: ${config.groupCount}, Elements: ${config.elementCount}`);
            });
            
            this.info('');
            this.info(`Total: ${configs.length} configurations`);
            this.info('Load with: /load -f "filename"');
        } catch (error) {
            this.error(`Error listing configurations: ${error.message}`);
        }
    }
}

export default LsCommand;