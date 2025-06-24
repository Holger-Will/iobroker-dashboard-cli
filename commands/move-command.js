import { BaseCommand } from './base-command.js';

export class MoveCommand extends BaseCommand {
    constructor(dashboard) {
        super(dashboard);
    }

    get name() {
        return 'move';
    }

    get aliases() {
        return ['mv'];
    }

    get description() {
        return 'Move groups or elements to different positions';
    }

    get usage() {
        return '/move [-g <group>] [-e <element>] [-c <up|down|top|bottom>]';
    }

    get flagSchema() {
        return {
            knownFlags: ['g', 'e', 'c', 'h'],
            flags: {
                g: { type: 'string', description: 'Group name to move (omit -e for group movement)' },
                e: { type: 'string', description: 'Element name to move within group' },
                c: { type: 'string', enum: ['up', 'down', 'top', 'bottom'], description: 'Direction to move (up/down/top/bottom)' },
                h: { type: 'boolean', description: 'Show help' }
            }
        };
    }

    get examples() {
        return [
            '/move -g "Solar System" -c up',
            '/move -g Solar -e "PV Power" -c down',
            '/move -g Temperatures -c top',
            '/move -g Controls -e "Restart Button" -c bottom'
        ];
    }

    async run(parsedArgs) {
        if (this.dashboard.isOnboarding && this.dashboard.onboardingStep === 'connection') {
            this.error('Please complete connection setup first. Use "/test -c" or skip connection.');
            return;
        }

        // Validate required flags
        if (!this.requireFlags(parsedArgs, ['g', 'c'])) {
            this.showUsage();
            return;
        }

        const groupName = parsedArgs.getFlag('g');
        const elementName = parsedArgs.getFlag('e', null);
        const direction = parsedArgs.getFlag('c');

        // Validate direction
        const validDirections = ['up', 'down', 'top', 'bottom'];
        if (!validDirections.includes(direction)) {
            this.error(`Invalid direction: ${direction}. Must be one of: ${validDirections.join(', ')}`);
            return;
        }

        try {
            if (elementName) {
                // Move element within group
                await this.moveElement(groupName, elementName, direction);
            } else {
                // Move group
                await this.moveGroup(groupName, direction);
            }
        } catch (error) {
            this.error(`Error moving: ${error.message}`);
        }
    }

    async moveGroup(groupName, direction) {
        // Find the group
        const groups = this.tools.listGroups();
        const group = groups.find(g => 
            g.title.toLowerCase().includes(groupName.toLowerCase()) || 
            g.id === groupName
        );

        if (!group) {
            this.error(`Group not found: ${groupName}`);
            this.showAvailableGroups(groups);
            return;
        }

        let result;
        switch (direction) {
            case 'up':
                result = await this.tools.moveGroupUp(group.id);
                break;
            case 'down':
                result = await this.tools.moveGroupDown(group.id);
                break;
            case 'top':
                result = await this.tools.moveGroupToTop(group.id);
                break;
            case 'bottom':
                result = await this.tools.moveGroupToBottom(group.id);
                break;
        }

        if (result.success) {
            this.success(`Moved group "${group.title}" ${direction}${result.newIndex !== undefined ? ` to position ${result.newIndex + 1}` : ''}`);
            
            // Force a complete re-render to show the new position
            this.dashboard.renderer.initialized = false;
            this.dashboard.renderer.elementPositions.clear();
            
            this.render();
        } else {
            this.error(`Failed to move group: ${result.error}`);
        }
    }

    async moveElement(groupName, elementName, direction) {
        // Find the group
        const groups = this.tools.listGroups();
        const group = groups.find(g => 
            g.title.toLowerCase().includes(groupName.toLowerCase()) || 
            g.id === groupName
        );

        if (!group) {
            this.error(`Group not found: ${groupName}`);
            this.showAvailableGroups(groups);
            return;
        }

        // Find the element
        const element = group.elements.find(e => 
            e.caption.toLowerCase().includes(elementName.toLowerCase()) || 
            e.id === elementName
        );

        if (!element) {
            this.error(`Element not found in group "${group.title}": ${elementName}`);
            this.showAvailableElements(group);
            return;
        }

        let result;
        switch (direction) {
            case 'up':
                result = await this.tools.moveElementUp(group.id, element.id);
                break;
            case 'down':
                result = await this.tools.moveElementDown(group.id, element.id);
                break;
            case 'top':
                // Move to top by repeatedly moving up
                let currentIndex = group.elements.findIndex(e => e.id === element.id);
                while (currentIndex > 0) {
                    const moveResult = await this.tools.moveElementUp(group.id, element.id);
                    if (!moveResult.success) {
                        result = moveResult;
                        break;
                    }
                    currentIndex--;
                }
                if (currentIndex === 0) {
                    result = { success: true, newIndex: 0 };
                }
                break;
            case 'bottom':
                // Move to bottom by repeatedly moving down
                let currentIdx = group.elements.findIndex(e => e.id === element.id);
                while (currentIdx < group.elements.length - 1) {
                    const moveResult = await this.tools.moveElementDown(group.id, element.id);
                    if (!moveResult.success) {
                        result = moveResult;
                        break;
                    }
                    currentIdx++;
                }
                if (currentIdx === group.elements.length - 1) {
                    result = { success: true, newIndex: group.elements.length - 1 };
                }
                break;
        }

        if (result.success) {
            this.success(`Moved element "${element.caption}" ${direction} in group "${group.title}"${result.newIndex !== undefined ? ` to position ${result.newIndex + 1}` : ''}`);
            
            // Force a complete re-render to show the new position
            this.dashboard.renderer.initialized = false;
            this.dashboard.renderer.elementPositions.clear();
            
            this.render();
        } else {
            this.error(`Failed to move element: ${result.error}`);
        }
    }

    showUsage() {
        this.info('Move command usage:');
        this.info('');
        this.info('Move group:');
        this.info('  /move -g <group> -c <up|down|top|bottom>');
        this.info('');
        this.info('Move element within group:');
        this.info('  /move -g <group> -e <element> -c <up|down|top|bottom>');
        this.info('');
        this.info('Examples:');
        this.examples.forEach(example => {
            this.info(`  ${example}`);
        });
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

    showAvailableElements(group) {
        if (group.elements.length === 0) {
            this.info(`No elements in group "${group.title}".`);
        } else {
            this.info(`Available elements in "${group.title}":`);
            group.elements.forEach((element, index) => {
                this.info(`  ${index + 1}. ${element.caption} (${element.type})`);
            });
        }
    }
}

export default MoveCommand;