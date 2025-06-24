import { EventEmitter } from 'events';

class LayoutEngine extends EventEmitter {
    constructor(options = {}) {
        super();
        
        this.config = {
            groupWidth: options.groupWidth || 40,
            groupPaddingX: options.groupPaddingX || 2,
            groupPaddingY: options.groupPaddingY || 1,
            showBorders: options.showBorders !== false, // default true
            terminalWidth: options.terminalWidth || process.stdout.columns || 80,
            terminalHeight: options.terminalHeight || process.stdout.rows || 24,
            inputFieldHeight: options.inputFieldHeight || 3, // reserve space for input at bottom
            ...options
        };
        
        this.groups = [];
        this.layout = null;
        
        // Listen for terminal resize
        if (process.stdout.isTTY) {
            process.stdout.on('resize', () => {
                this.config.terminalWidth = process.stdout.columns;
                this.config.terminalHeight = process.stdout.rows;
                this.calculateLayout();
                this.emit('resize', this.layout);
            });
        }
    }

    // Add a group to the dashboard
    addGroup(group) {
        this.groups.push({
            id: group.id || `group_${Date.now()}`,
            title: group.title || 'Untitled Group',
            elements: group.elements || [],
            ...group
        });
        this.calculateLayout();
        return this.groups[this.groups.length - 1];
    }

    // Remove a group by ID
    removeGroup(groupId) {
        const index = this.groups.findIndex(g => g.id === groupId);
        if (index !== -1) {
            const removedGroup = this.groups.splice(index, 1)[0];
            this.calculateLayout();
            return removedGroup;
        }
        return null;
    }

    // Move group to new position in array
    moveGroup(groupId, newIndex) {
        const currentIndex = this.groups.findIndex(g => g.id === groupId);
        if (currentIndex !== -1 && newIndex >= 0 && newIndex < this.groups.length) {
            const [group] = this.groups.splice(currentIndex, 1);
            this.groups.splice(newIndex, 0, group);
            this.calculateLayout();
            return true;
        }
        return false;
    }

    // Calculate group height (title + elements + borders)
    calculateGroupHeight(group) {
        let height = 0;
        
        // Title line (only if no borders, since borders integrate the title)
        if (group.title && !this.config.showBorders) {
            height += 1;
        }
        
        // Elements
        height += group.elements.length;
        
        // Borders (top and bottom) - title is integrated into top border
        if (this.config.showBorders) {
            height += 2;
            // Ensure minimum height for empty groups with borders
            if (group.elements.length === 0) {
                height = Math.max(height, 3); // minimum 3 lines for empty bordered group
            }
        }
        
        // Minimum height for any group
        return Math.max(height, 1);
    }

    // Calculate how many groups fit horizontally
    calculateColumnsCount() {
        const availableWidth = this.config.terminalWidth;
        const groupWithPadding = this.config.groupWidth + this.config.groupPaddingX;
        
        // At least one column, but account for padding
        const columns = Math.max(1, Math.floor((availableWidth + this.config.groupPaddingX) / groupWithPadding));
        
        return columns;
    }

    // Masonry layout algorithm
    calculateLayout() {
        const columns = this.calculateColumnsCount();
        const availableHeight = this.config.terminalHeight - this.config.inputFieldHeight;
        
        // Initialize column heights
        const columnHeights = new Array(columns).fill(0);
        const columnContents = new Array(columns).fill(null).map(() => []);
        
        // Place each group in the shortest column
        for (const group of this.groups) {
            const groupHeight = this.calculateGroupHeight(group);
            
            // Find the shortest column
            let shortestColumn = 0;
            let shortestHeight = columnHeights[0];
            
            for (let i = 1; i < columns; i++) {
                if (columnHeights[i] < shortestHeight) {
                    shortestHeight = columnHeights[i];
                    shortestColumn = i;
                }
            }
            
            // Place group in shortest column
            const x = shortestColumn * (this.config.groupWidth + this.config.groupPaddingX);
            const y = columnHeights[shortestColumn];
            
            const layoutGroup = {
                ...group,
                x,
                y,
                width: this.config.groupWidth,
                height: groupHeight,
                column: shortestColumn
            };
            
            columnContents[shortestColumn].push(layoutGroup);
            columnHeights[shortestColumn] += groupHeight + this.config.groupPaddingY;
        }
        
        // Flatten column contents
        const layoutGroups = columnContents.flat();
        
        this.layout = {
            groups: layoutGroups,
            columns,
            columnHeights,
            totalHeight: Math.max(...columnHeights),
            availableHeight,
            terminalWidth: this.config.terminalWidth,
            terminalHeight: this.config.terminalHeight,
            needsScrolling: Math.max(...columnHeights) > availableHeight
        };
        
        this.emit('layout-changed', this.layout);
        return this.layout;
    }

    // Get current layout
    getLayout() {
        if (!this.layout) {
            this.calculateLayout();
        }
        return this.layout;
    }

    // Update terminal dimensions
    updateTerminalSize(width, height) {
        this.config.terminalWidth = width;
        this.config.terminalHeight = height;
        this.calculateLayout();
    }

    // Get group by ID
    getGroup(groupId) {
        return this.groups.find(g => g.id === groupId);
    }

    // Add element to group
    addElementToGroup(groupId, element, insertIndex = undefined) {
        const group = this.getGroup(groupId);
        if (group) {
            if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= group.elements.length) {
                group.elements.splice(insertIndex, 0, element);
            } else {
                group.elements.push(element);
            }
            this.calculateLayout();
            return element; // Return the original DashboardElement instance
        }
        return null;
    }

    // Remove element from group
    removeElementFromGroup(groupId, elementId) {
        const group = this.getGroup(groupId);
        if (group) {
            const index = group.elements.findIndex(e => e.id === elementId);
            if (index !== -1) {
                const removedElement = group.elements.splice(index, 1)[0];
                this.calculateLayout();
                return removedElement;
            }
        }
        return null;
    }

    // Move element between groups
    moveElement(elementId, fromGroupId, toGroupId, position = -1) {
        const fromGroup = this.getGroup(fromGroupId);
        const toGroup = this.getGroup(toGroupId);
        
        if (fromGroup && toGroup) {
            const elementIndex = fromGroup.elements.findIndex(e => e.id === elementId);
            if (elementIndex !== -1) {
                const [element] = fromGroup.elements.splice(elementIndex, 1);
                
                if (position === -1) {
                    toGroup.elements.push(element);
                } else {
                    toGroup.elements.splice(position, 0, element);
                }
                
                this.calculateLayout();
                return true;
            }
        }
        return false;
    }

    // Debug: Print layout info
    debugLayout() {
        const layout = this.getLayout();
        console.log('Layout Debug:');
        console.log(`Terminal: ${layout.terminalWidth}x${layout.terminalHeight}`);
        console.log(`Columns: ${layout.columns}`);
        console.log(`Total Height: ${layout.totalHeight}`);
        console.log(`Needs Scrolling: ${layout.needsScrolling}`);
        
        layout.groups.forEach((group, i) => {
            console.log(`Group ${i}: "${group.title}" at (${group.x}, ${group.y}) size ${group.width}x${group.height}`);
        });
    }
}

export default LayoutEngine;