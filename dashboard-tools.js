import { EventEmitter } from 'events';
import { createElement } from './dashboard-elements.js';

class DashboardTools extends EventEmitter {
    constructor(layoutEngine, configManager) {
        super();
        
        this.layoutEngine = layoutEngine;
        this.configManager = configManager;
    }

    // Group Management
    async addGroup(title, position = -1) {
        try {
            const group = {
                id: `group_${Date.now()}`,
                title: title,
                elements: []
            };
            
            if (position === -1) {
                this.layoutEngine.addGroup(group);
            } else {
                // Insert at specific position
                this.layoutEngine.groups.splice(position, 0, group);
                this.layoutEngine.calculateLayout();
            }
            
            this.emit('groupAdded', { group });
            
            return { success: true, group };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async removeGroup(groupId) {
        try {
            const group = this.layoutEngine.getGroup(groupId);
            if (!group) {
                throw new Error(`Group ${groupId} not found`);
            }
            
            // Check if group has elements
            if (group.elements.length > 0) {
                return {
                    success: false,
                    error: 'Group contains elements',
                    requiresConfirmation: true,
                    group,
                    elements: group.elements
                };
            }
            
            const removedGroup = this.layoutEngine.removeGroup(groupId);
            
            this.emit('groupRemoved', { group: removedGroup });
            
            return { success: true, group: removedGroup };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async removeGroupWithElements(groupId) {
        try {
            const removedGroup = this.layoutEngine.removeGroup(groupId);
            
            this.emit('groupRemoved', { group: removedGroup });
            
            return { success: true, group: removedGroup };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveGroupUp(groupId) {
        try {
            const currentIndex = this.layoutEngine.groups.findIndex(g => g.id === groupId);
            if (currentIndex === -1) {
                throw new Error(`Group ${groupId} not found`);
            }
            
            if (currentIndex === 0) {
                return { success: false, error: 'Group is already at the top' };
            }
            
            const success = this.layoutEngine.moveGroup(groupId, currentIndex - 1);
            
            if (success) {
                this.emit('groupMoved', { groupId, direction: 'up', newIndex: currentIndex - 1 });
                return { success: true, newIndex: currentIndex - 1 };
            } else {
                return { success: false, error: 'Failed to move group' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveGroupDown(groupId) {
        try {
            const currentIndex = this.layoutEngine.groups.findIndex(g => g.id === groupId);
            if (currentIndex === -1) {
                throw new Error(`Group ${groupId} not found`);
            }
            
            if (currentIndex === this.layoutEngine.groups.length - 1) {
                return { success: false, error: 'Group is already at the bottom' };
            }
            
            const success = this.layoutEngine.moveGroup(groupId, currentIndex + 1);
            
            if (success) {
                this.emit('groupMoved', { groupId, direction: 'down', newIndex: currentIndex + 1 });
                return { success: true, newIndex: currentIndex + 1 };
            } else {
                return { success: false, error: 'Failed to move group' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveGroupToTop(groupId) {
        try {
            const success = this.layoutEngine.moveGroup(groupId, 0);
            
            if (success) {
                this.emit('groupMoved', { groupId, direction: 'top', newIndex: 0 });
                return { success: true, newIndex: 0 };
            } else {
                return { success: false, error: 'Failed to move group to top' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveGroupToBottom(groupId) {
        try {
            const newIndex = this.layoutEngine.groups.length - 1;
            const success = this.layoutEngine.moveGroup(groupId, newIndex);
            
            if (success) {
                this.emit('groupMoved', { groupId, direction: 'bottom', newIndex });
                return { success: true, newIndex };
            } else {
                return { success: false, error: 'Failed to move group to bottom' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async renameGroup(groupId, newTitle) {
        try {
            const group = this.layoutEngine.getGroup(groupId);
            if (!group) {
                throw new Error(`Group ${groupId} not found`);
            }
            
            const oldTitle = group.title;
            group.title = newTitle;
            
            this.layoutEngine.calculateLayout();
            
            this.emit('groupRenamed', { groupId, oldTitle, newTitle });
            
            return { success: true, oldTitle, newTitle };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Element Management
    async addElement(groupId, elementConfig) {
        try {
            // Create a proper DashboardElement instance
            const element = createElement(elementConfig);
            
            // Add it to the group
            const addedElement = this.layoutEngine.addElementToGroup(groupId, element);
            
            if (addedElement) {
                this.emit('elementAdded', { groupId, element: addedElement });
                return { success: true, element: addedElement };
            } else {
                throw new Error('Failed to add element');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async removeElement(groupId, elementId) {
        try {
            const element = this.layoutEngine.removeElementFromGroup(groupId, elementId);
            
            if (element) {
                this.emit('elementRemoved', { groupId, element });
                return { success: true, element };
            } else {
                throw new Error('Element not found');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveElement(elementId, fromGroupId, toGroupId, position = -1) {
        try {
            const success = this.layoutEngine.moveElement(elementId, fromGroupId, toGroupId, position);
            
            if (success) {
                this.emit('elementMoved', { elementId, fromGroupId, toGroupId, position });
                return { success: true };
            } else {
                throw new Error('Failed to move element');
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveElementUp(groupId, elementId) {
        try {
            const group = this.layoutEngine.getGroup(groupId);
            if (!group) {
                throw new Error(`Group ${groupId} not found`);
            }
            
            const currentIndex = group.elements.findIndex(e => e.id === elementId);
            if (currentIndex === -1) {
                throw new Error(`Element ${elementId} not found in group ${groupId}`);
            }
            
            if (currentIndex === 0) {
                return { success: false, error: 'Element is already at the top' };
            }
            
            // Swap with previous element
            const temp = group.elements[currentIndex];
            group.elements[currentIndex] = group.elements[currentIndex - 1];
            group.elements[currentIndex - 1] = temp;
            
            this.layoutEngine.calculateLayout();
            
            this.emit('elementMoved', { elementId, groupId, direction: 'up', newIndex: currentIndex - 1 });
            
            return { success: true, newIndex: currentIndex - 1 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async moveElementDown(groupId, elementId) {
        try {
            const group = this.layoutEngine.getGroup(groupId);
            if (!group) {
                throw new Error(`Group ${groupId} not found`);
            }
            
            const currentIndex = group.elements.findIndex(e => e.id === elementId);
            if (currentIndex === -1) {
                throw new Error(`Element ${elementId} not found in group ${groupId}`);
            }
            
            if (currentIndex === group.elements.length - 1) {
                return { success: false, error: 'Element is already at the bottom' };
            }
            
            // Swap with next element
            const temp = group.elements[currentIndex];
            group.elements[currentIndex] = group.elements[currentIndex + 1];
            group.elements[currentIndex + 1] = temp;
            
            this.layoutEngine.calculateLayout();
            
            this.emit('elementMoved', { elementId, groupId, direction: 'down', newIndex: currentIndex + 1 });
            
            return { success: true, newIndex: currentIndex + 1 };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Information and Listing
    listGroups() {
        return this.layoutEngine.groups.map(group => ({
            id: group.id,
            title: group.title,
            elementCount: group.elements.length,
            elements: group.elements.map(el => ({
                id: el.id,
                type: el.type,
                caption: el.caption,
                stateId: el.stateId
            }))
        }));
    }

    listElements(groupId = null) {
        if (groupId) {
            const group = this.layoutEngine.getGroup(groupId);
            if (!group) {
                return { success: false, error: `Group ${groupId} not found` };
            }
            
            return {
                success: true,
                groupId,
                groupTitle: group.title,
                elements: group.elements.map(el => ({
                    id: el.id,
                    type: el.type,
                    caption: el.caption,
                    stateId: el.stateId,
                    value: el.value
                }))
            };
        } else {
            // List all elements from all groups
            const allElements = [];
            
            for (const group of this.layoutEngine.groups) {
                for (const element of group.elements) {
                    allElements.push({
                        id: element.id,
                        type: element.type,
                        caption: element.caption,
                        stateId: element.stateId,
                        value: element.value,
                        groupId: group.id,
                        groupTitle: group.title
                    });
                }
            }
            
            return { success: true, elements: allElements };
        }
    }

    // Find states available in ioBroker
    async findStates(pattern = '*') {
        // This would integrate with the ioBroker client to search for available states
        // For now, return a placeholder
        return {
            success: true,
            pattern,
            states: [
                // This would be populated by the ioBroker client
                'javascript.0.solar.produktion',
                'javascript.0.solar.batterie',
                'javascript.0.solar.einspeisung',
                'modbus.0.inputRegisters.5016_Total_DC_Power',
                'system.adapter.web.0.alive'
            ]
        };
    }

    // Configuration Management
    async saveLayout(filename = null) {
        if (!this.configManager) {
            return { success: false, error: 'Config manager not available' };
        }
        
        return await this.configManager.save(filename);
    }

    async loadLayout(filename = null) {
        if (!this.configManager) {
            return { success: false, error: 'Config manager not available' };
        }
        
        return await this.configManager.load(filename);
    }

    async listLayouts() {
        if (!this.configManager) {
            return { success: false, error: 'Config manager not available' };
        }
        
        return await this.configManager.listConfigs();
    }

    // Dashboard Status
    getStatus() {
        const layout = this.layoutEngine.getLayout();
        
        return {
            groups: this.layoutEngine.groups.length,
            totalElements: this.layoutEngine.groups.reduce((total, group) => total + group.elements.length, 0),
            layout: {
                columns: layout.columns,
                totalHeight: layout.totalHeight,
                needsScrolling: layout.needsScrolling,
                terminalSize: `${layout.terminalWidth}x${layout.terminalHeight}`
            },
            config: this.configManager?.getStatus() || null
        };
    }
}

export default DashboardTools;