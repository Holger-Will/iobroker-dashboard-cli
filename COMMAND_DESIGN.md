# ioBroker Dashboard CLI - Flag-Based Command System Design

**Status:** Design Phase Complete - Ready for Implementation  
**Date:** 2025-06-24  

## Overview

Complete redesign of the command system using flag-based arguments instead of positional parameters. All commands use `/` prefix to differentiate from AI inputs.

## Core Principles

1. **Flag-based arguments** - Order independent
2. **Universal `-h` help** - Every command supports help
3. **Smart auto-inference** - Use getObject() for type/name detection  
4. **Safety confirmations** - Preview dangerous operations
5. **Unified systems** - Single commands handle multiple operations

## Command Specifications

### 1. `/add` - Smart Element/Group Creation

**Syntax:** `/add [flags]`

**Flags:**
- `-g <groupname>` - Target group name for elements
- `-n <name>` - Name/title (optional, uses common.name from getObject)
- `-s <stateId>` - State ID (optional, when omitted = group creation)
- `-i <index>` - Insert position (optional, default: append at end)
- `-t <type>` - Element type (optional, inferred from getObject)

**Behaviors:**
1. **Add Element to Group:** `/add -g "Temperatures" -s <stateId>` → Creates element in specified group
2. **Add Group:** `/add -g "Solar System"` (no `-s`) → Creates new group
3. **Smart Element:** `/add -g "Temp" -s modbus.temp` → Auto-infers name & type
4. **Full Control:** `/add -g "Temp" -s temp.sensor -n "Custom" -t gauge -i 1`

**Logic:**
- **Has `-s`?** → Add element to group specified by `-g`
- **No `-s`?** → Create group with name from `-g`
- **Group doesn't exist?** → Auto-create it first

**Examples:**
```bash
/add -g "Temperatures" -s modbus.2.holdingRegisters._Aussentemparatur    # Smart element
/add -g "Sensors" -s temp.sensor -n "Custom Name" -t gauge -i 1         # Full control
/add -g "Solar System"                                                   # Create group
```

### 2. `/ls` - List Dashboard Components

**Syntax:** `/ls [flags]`

**Flags:**
- `-e [groupname]` - List elements (with value: specific group, without: all elements)
- `-g` (no param) - List all groups
- `-c` (no param) - List all saved configurations

**Behaviors:**
1. `/ls -e` → List all elements in all groups
2. `/ls -e "Temperatures"` → List elements only in "Temperatures" group
3. `/ls -g` → List all groups (names, element counts)
4. `/ls -c` → List all saved dashboard configurations

### 3. `/quit` - Exit Application

**Syntax:** `/quit`
**No flags needed.**

### 4. `/status` - Dashboard Status

**Syntax:** `/status`

**Enhanced Output:** Add to existing status display:
- **MCP Connection:** Connected/Disconnected + server URL
- **MCP Tools:** Number of available tools 
- **AI Assistant:** Available/Unavailable (API key configured?)
- **AI Chat History:** Number of messages in conversation

### 5. `/load` - Load Dashboard Configuration

**Syntax:** `/load [flags]`

**Flags:**
- `-f <filename>` - Load specific dashboard file
- `-l` (no param) - List all available dashboard files
- `-d <filename>` - Set specified file as default dashboard

**Behaviors:**
1. `/load -f "my-dashboard.json"` → Load specific dashboard
2. `/load -l` → Show all available dashboard files with details
3. `/load -d "solar-dashboard.json"` → Set as default (loads on startup)

### 6. `/save` - Save Dashboard Configuration

**Syntax:** `/save [flags]`

**Flags:**
- `-f <filename>` - Save to specific filename
- `-d` (no param) - Save as default dashboard

**Behaviors:**
1. `/save` → Save to current file (whatever was last loaded/saved)
2. `/save -f "my-dashboard.json"` → Save to specific file
3. `/save -d` → Save current dashboard as the default (auto-loads on startup)

### 7. `/help` - Help System

**Syntax:** `/help [commandname]`

**Behaviors:**
1. `/help` → Show all available commands (overview)
2. `/help add` → Show detailed help for `/add` command

**Universal `-h` Flag:** Every command supports `-h` for help:
- `/add -h` → Same as `/help add`
- `/save -h` → Same as `/help save`

### 8. `/rename` - Rename Groups/Elements

**Syntax:** `/rename [flags]`

**Flags:**
- `-o <oldname>` - Current name of object to rename
- `-n <newname>` - New name (optional, uses getObject default if omitted)
- `-g [groupname]` - **Polymorphic group flag**

**Polymorphic `-g` Flag Behavior:**
1. **`-g <groupname>`** → Element context: rename element within specific group
2. **`-g`** (no value) → Group mode: rename the group itself  
3. **No `-g`** → Global mode: rename element in ALL groups where it exists

**Examples:**
```bash
/rename -g "Climate" -o "Temp1" -n "Garden Temp"    # Rename in specific group
/rename -g -o "Temperatures" -n "Climate Control"   # Rename group
/rename -o "Pump Status"                             # Rename element globally (auto-name)
```

### 9. `/set` - Unified Settings Management

**Syntax:** `/set [flags]`

**Flags:**
- `-n <name>` - Setting name (dot-notation)
- `-v <value>` - Setting value (type-aware)
- `-l` (no param) - List all settings
- `-r <name>` - Reset setting to default
- `-t <theme_name>` - Save current color scheme as named theme

**Settings Categories:**

#### Connection Settings:
```bash
/set -n iobroker.url -v "http://192.168.1.100:8082"
/set -n mcp.url -v "http://192.168.1.100:8082/kiwi/0/mcp"
```

#### Theme & Color Settings:
```bash
# Individual colors
/set -n theme.border -v "brightBlue"
/set -n theme.title -v "brightCyan"
/set -n theme.active -v "brightGreen"

# Border styles  
/set -n theme.border_style -v "rounded"    # rounded, square, thick, double

# Predefined themes
/set -n theme.preset -v "dark"             # dark, light, matrix, retro
```

#### Save/Load Custom Themes:
```bash
/set -t "my-solar-theme"                   # Save current colors as "my-solar-theme"
/set -n theme.preset -v "my-solar-theme"  # Load your saved theme
```

### 10. `/test` - Generalized Testing Framework

**Syntax:** `/test [flags]`

**Flags:**
- `-c <connection>` - Test connection type
- `-t <tool>` - Test MCP tool
- `-s <socket-emit>` - Test Socket.IO emit
- `-p <parameters>` - Parameters for tool/socket (JSON format)
- `-l` (no param) - List all available tests

**Connection Tests:**
```bash
/test -c socket          # Test ioBroker Socket.IO connection
/test -c mcp             # Test MCP server connection  
/test -c ai              # Test AI API connection
```

**MCP Tool Tests:**
```bash
/test -t getState -p '{"id": "javascript.0.solar.produktion"}'
/test -t search -p '{"query": "temperature"}'
/test -t setState -p '{"id": "test.state", "value": true, "ack": false}'
```

**Socket.IO Tests:**
```bash
/test -s getState -p '{"id": "system.adapter.web.0.alive"}'
/test -s getObject -p '{"id": "javascript.0.solar.produktion"}'
```

### 11. `/remove` - Safe Removal with Confirmation

**Syntax:** `/remove [flags]`

**Flags:**
- `-g <groupname>` - Remove entire group (and all its elements)
- `-e <elementname>` - Remove element by name
- `-i <index>` - Remove element by index (requires `-g`)
- `-f` (no param) - Force removal without confirmation

**Safety Features:**
1. **Always Show Preview:** What will be removed before confirmation
2. **Element Count:** Show number of affected items
3. **State IDs:** Display the actual ioBroker state being disconnected
4. **Confirmation Required:** User must type 'y' or 'yes' to proceed

**Examples:**
```bash
/remove -g "Solar System"                  # Remove group + all elements
/remove -g "Temperatures" -e "Old Sensor" # Remove specific element  
/remove -g "Sensors" -i 2                 # Remove element by index
/remove -e "Temperature Sensor"           # Remove from ALL groups
```

### 12. `/clear-chat` - Clear AI Conversation

**Syntax:** `/clear-chat`
**No changes from current implementation.**

### 13. `/move` - Reorder Elements and Groups

**Syntax:** `/move [flags]`

**Flags:**
- `-g <groupname>` - Target group name
- `-e <elementname>` - Element to move (requires `-g`)
- `-c <command>` - Move command: `up`, `down`, `top`, `bottom`

**Move Modes:**

#### Move Group in Hierarchy:
```bash
/move -g "Solar System" -c up      # Move group up one position
/move -g "Temperatures" -c top     # Move group to top
/move -g "Kitchen" -c bottom       # Move group to bottom
```

#### Move Element within Group:
```bash
/move -g "Solar System" -e "PV Power" -c up     # Move element up in group
/move -g "Temperatures" -e "Outdoor" -c top     # Move element to top of group
/move -g "Kitchen" -e "Dishwasher" -c bottom    # Move element to bottom of group
```

**Smart Behavior:**
- **Boundary Handling:** `up` at position 1 does nothing, `down` at last position does nothing
- **`top`/`bottom`:** Always work regardless of current position
- **Auto-save:** Changes are immediately saved to current dashboard

### 14. `/tm` - Toggle Mode (Dashboard ↔ Command Mode)

**Syntax:** `/tm`

**Behaviors:**
- **Dashboard Mode** (default): Dashboard visible + small output window  
- **Command Mode**: Full-screen output window + input field only
- **Toggle Key:** `ESC` for quick switching
- **Use Cases:** Debugging, reading long AI responses, viewing test results

## UI & Navigation Enhancements

### 1. 📺 **Framed Output Window**
- **Current:** Simple message area
- **Enhanced:** Complete bordered frame like groups/input field
- **Consistency:** Match visual style of dashboard elements

### 2. 🔄 **Command Mode Toggle**
- **ESC key:** Quick toggle between dashboard/command modes
- **`/tm` command:** Same functionality as ESC
- **Dashboard Mode:** Normal view with dashboard + small output
- **Command Mode:** Full-screen output window for detailed work

### 3. ⌨️ **Dashboard Hotkeys**
- **Number keys [1-9,0]:** Quick load dashboard files
- **Configuration:** Use `/set` command to assign dashboards to keys
- **Examples:**
  ```bash
  /set -n hotkey.1 -v "main-dashboard.json"      # Press '1' to load
  /set -n hotkey.2 -v "solar-system.json"       # Press '2' to load  
  /set -n hotkey.0 -v "debug-dashboard.json"    # Press '0' to load
  ```

### 4. 🖱️ **Smart Key Handling**
- **Numbers (1-9,0):** Load dashboards when not typing
- **ESC:** Toggle mode when not typing, cancel input when typing
- **Up/Down:** Command history when typing, scroll when not typing

## Implementation Requirements

### 1. Flag Parser System
- Handle quoted arguments: `/add -g "Solar System" -n "PV Power"`
- Support optional values: `-g` vs `-g <value>`
- Type inference: URLs, booleans, numbers, strings
- Error handling with suggestions

### 2. Unified Settings Manager
- Consolidate .env, settings.json, and runtime config
- Dot-notation keys: `iobroker.url`, `theme.border`
- Type-aware value storage
- Theme persistence system

### 3. Safety & UX Features
- Confirmation dialogs with previews
- Smart auto-inference from getObject()
- Universal `-h` help flag
- Real-time visual feedback

### 4. Removed Commands
- `add-group` → merged into `/add`
- `set-url` → merged into `/set`
- `test-connection` → merged into `/test`
- `skip-connection` → removed (onboarding redesign)
- `remove-element` & `remove-group` → merged into `/remove`

## Input & Navigation Issues

### Current Problems (Fixed/Identified):

1. **✅ FIXED: Left/Right Arrow Keys** 
   - **Problem:** Arrow key handler was blocking all arrows, preventing command input editing
   - **Solution:** Only handle left/right arrows when needed, allow terminal cursor movement
   - **Status:** Fixed in input handler

2. **🔍 DESIGN NEEDED: Command History vs Message Scrolling**
   - **Problem:** Up/Down arrows traditionally used for command history, but currently used for message scrolling
   - **Conflict:** When typing commands, up/down should recall previous commands, not scroll messages
   - **Current Behavior:** Up/down only scrolls when input buffer is empty
   - **Need Solution For:** 
     - Command history storage and navigation
     - Alternative scrolling method (PageUp/PageDown? Ctrl+Up/Down?)
     - Intuitive UX that doesn't conflict

### Proposed Solutions for Command History:
- **Option A:** Use PageUp/PageDown for message scrolling, Up/Down for command history
- **Option B:** Use Ctrl+Up/Down for message scrolling, Up/Down for command history  
- **Option C:** Use separate key combo for command history (Ctrl+P/N like bash)

## Next Steps

1. **URGENT:** Fix left/right arrow input editing (✅ DONE)
2. **DESIGN:** Resolve command history vs scrolling key conflict
3. Implement robust flag parser
4. Create unified settings manager  
5. Update BaseCommand class for flag support
6. Migrate existing commands to new system
7. Update AI service for new command syntax
8. Implement theme management system
9. Add safety confirmation system

---

**This design provides a modern, consistent, and powerful command interface for the ioBroker Dashboard CLI.**