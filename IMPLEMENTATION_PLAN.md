# ioBroker Dashboard CLI - Global Implementation Plan

**Date:** June 25, 2025
**Purpose:** Comprehensive implementation plan with dependency analysis for all specifications

## Specification Overview

### All Completed Specifications (12 total)

**Foundation & Configuration:**
1. **Column-Based Layout System** (`COLUMN_BASED_LAYOUT_SPEC.md`)
2. **Unified /set Command** (`SET_COMMAND_SPEC.md`) 
3. **User Data Directory** (`USER_DATA_DIRECTORY_SPEC.md`)
4. **Dashboard Configs Management** (`DASHBOARD_CONFIGS_SPEC.md`)

**UI Components:**
5. **Visual Slider Element** (`VISUAL_SLIDER_ELEMENT_SPEC.md`)
6. **Status Header** (`STATUS_HEADER_SPEC.md`)
7. **Number Input Element** (`NUMBER_INPUT_ELEMENT_SPEC.md`)
8. **Visual Gauge Element** (`VISUAL_GAUGE_ELEMENT_SPEC.md`)

**AI & Automation:**
9. **AI Local Tools** (`AI_LOCAL_TOOLS_SPEC.md`)
10. **Auto Dashboard Generation** (`AUTO_DASHBOARD_GENERATION_SPEC.md`)
11. **Auto Dashboard Role Filtering** (`AUTO_DASHBOARD_ROLE_FILTERING_SPEC.md`)

**Specialized Features:**
12. **Temperature Dashboard** (`TEMPERATURE_DASHBOARD_SPEC.md`)

## Dependency Analysis

### Core Dependencies
```
Foundation Layer (Must be first):
├── User Data Directory ← Data safety foundation
├── Dashboard Configs Management ← Configuration structure  
├── Column-Based Layout ← Base for all UI rendering
└── Unified /set Command ← Configuration management

UI Component Layer (Independent):
├── Visual Slider Element 
├── Status Header
├── Number Input Element
└── Visual Gauge Element

AI & Automation Layer (Needs foundation):
├── AI Local Tools ← Needs core commands
├── Auto Dashboard Generation ← Needs stable layout + tools
└── Auto Dashboard Role Filtering ← Extends auto generation

Specialized Layer (Needs everything):
└── Temperature Dashboard ← Uses all components
```

### Implementation Priority Matrix

**Priority 1 (High) - Foundation & Data Safety**
- User Data Directory (data safety)
- Dashboard Configs Management (structure)
- Column-Based Layout System (core UI)
- Unified /set Command (configuration)

**Priority 2 (Medium) - UI Components & AI**
- Visual Slider Element
- Status Header  
- Number Input Element
- Visual Gauge Element
- AI Local Tools

**Priority 3 (Low) - Advanced Features**
- Auto Dashboard Generation
- Auto Dashboard Role Filtering
- Temperature Dashboard

## Detailed Implementation Tasks

### 1. Column-Based Layout System
**Dependencies:** None (foundation)
**Impact:** High - affects all rendering

#### Tasks:
- [ ] **CLB-1**: Update UnifiedSettingsManager defaults
  - Replace `dashboard.group_width` with `layout.columns` 
  - Add `layout.padding`, `layout.rowSpacing`, `layout.responsive`
  - Set `layout.columns` default to 4

- [ ] **CLB-2**: Create enhanced LayoutEngine
  - Add `calculateGroupWidth(terminalWidth, columns)` method
  - Add `getEffectiveColumns(requestedColumns, terminalWidth)` method
  - Add terminal width validation (min 40 chars)
  - Add column-based group arrangement logic

- [ ] **CLB-3**: Add terminal resize handling to index.js
  - Add SIGWINCH event listener with debouncing (150ms)
  - Add `handleTerminalResize()` and `recalculateLayout()` methods
  - Force renderer re-initialization on resize

- [ ] **CLB-4**: Update SmoothRenderer for resize events
  - Add resize detection in `updateRender()`
  - Add `handleResizeRender()` method for complete re-render
  - Clear element positions cache on resize

#### Estimated Time: 1-2 days

### 2. Unified /set Command
**Dependencies:** Column-based layout (for validation)
**Impact:** Medium - configuration management

#### Tasks:
- [ ] **SET-1**: Create SetCommand class
  - Implement dot-notation key parsing
  - Add validation for layout settings (columns 1-8, padding 0-5)
  - Add warning for narrow group widths

- [ ] **SET-2**: Add side effects system
  - Layout changes trigger immediate re-render
  - Theme changes apply immediately
  - Settings persistence through UnifiedSettingsManager

- [ ] **SET-3**: Implement list and get functionality
  - `/set -l` lists all settings by category
  - `/set layout.columns` shows current value
  - Category filtering (layout, theme, etc.)

#### Estimated Time: 1 day

### 3. Visual Slider Element
**Dependencies:** None (independent component)
**Impact:** Low - new element type

#### Tasks:
- [ ] **SLD-1**: Create VisualSliderElement class
  - Implement 20-character handle representation
  - Add `renderSlider(value, min, max, width)` method
  - Calculate handle position with proper bounds

- [ ] **SLD-2**: Update element factory
  - Add 'slider' type to createElements
  - Add element registration in dashboard-elements.js

- [ ] **SLD-3**: Add interactive slider controls
  - Keyboard interaction (arrow keys, page up/down)
  - Value updating and state synchronization
  - Visual feedback during interaction

#### Estimated Time: 0.5 days

### 4. Status Header
**Dependencies:** None (independent component)
**Impact:** Low - UI enhancement

#### Tasks:
- [ ] **HDR-1**: Create StatusHeader class
  - Implement first-line header rendering
  - Add dashboard name, connection status, time display
  - Implement MCP tool count display

- [ ] **HDR-2**: Update SmoothRenderer integration
  - Reserve first line for status header
  - Adjust dashboard area calculations
  - Update scroll and layout calculations

- [ ] **HDR-3**: Add real-time updates
  - Connection status monitoring
  - Time updates (every minute)
  - MCP status polling

#### Estimated Time: 0.5 days

### 5. Auto Dashboard Generation
**Dependencies:** Column layout, /set command (for saving configs)
**Impact:** High - major feature

#### Tasks:
- [ ] **GEN-1**: Create DashboardGenerator class
  - Implement enum querying (`enum.functions.*`, `enum.rooms.*`)
  - Add state grouping by room/function
  - Implement device name resolution logic

- [ ] **GEN-2**: Add smart element creation
  - Role-to-element-type mapping
  - Device name extraction from parent objects
  - State suffix logic (Level, Power, etc.)

- [ ] **GEN-3**: Create GenerateCommand
  - Implement `-f`, `-r`, `-a` flags for generation types
  - Add `-s` flag for auto-saving
  - Error handling for missing enums

- [ ] **GEN-4**: Add AI tool integration
  - MCP tool for natural language generation
  - Example: "generate lighting dashboard"

#### Estimated Time: 2-3 days

## Implementation Sequence

### Phase 1: Foundation (Priority 1)
**Duration:** 2-3 days
**Focus:** Core layout and configuration systems

1. **Day 1-2:** Column-Based Layout System
   - CLB-1: Update settings defaults
   - CLB-2: Enhanced LayoutEngine  
   - CLB-3: Terminal resize handling
   - CLB-4: Renderer updates

2. **Day 2-3:** Unified /set Command
   - SET-1: SetCommand implementation
   - SET-2: Side effects system
   - SET-3: List/get functionality

### Phase 2: UI Components (Priority 2)  
**Duration:** 1 day
**Focus:** Independent UI enhancements

3. **Day 4:** Visual Components
   - SLD-1, SLD-2, SLD-3: Visual Slider Element
   - HDR-1, HDR-2, HDR-3: Status Header

### Phase 3: Advanced Features (Priority 3)
**Duration:** 2-3 days  
**Focus:** Auto-generation capabilities

4. **Day 5-7:** Auto Dashboard Generation
   - GEN-1: DashboardGenerator core
   - GEN-2: Smart element creation
   - GEN-3: GenerateCommand
   - GEN-4: AI integration

## Risk Assessment

### High Risk
- **Column Layout**: Core foundation - any issues affect everything
- **Terminal Resize**: Complex interaction with rendering system

### Medium Risk  
- **Auto Generation**: Complex ioBroker enum parsing
- **Device Name Resolution**: Depends on ioBroker object structure

### Low Risk
- **Visual Slider**: Self-contained component
- **Status Header**: Simple UI addition
- **Unified /set**: Extends existing patterns

## Testing Strategy

### Phase 1 Testing
- Verify column layout on different terminal sizes
- Test resize behavior and debouncing
- Validate /set command with all setting types

### Phase 2 Testing  
- Test slider element with various value ranges
- Verify status header in different states
- Ensure no layout conflicts

### Phase 3 Testing
- Test with real ioBroker enum data
- Verify device name resolution with different adapters
- Test generation with missing/incomplete enums

## Success Criteria

### Phase 1 Complete
- [x] Terminal can resize without breaking layout
- [x] Users can set columns with `/set layout.columns N`
- [x] Groups automatically adjust width based on terminal size
- [x] Settings persist across restarts

### Phase 2 Complete
- [x] Visual sliders display and respond to interaction
- [x] Status header shows current system state
- [x] UI feels polished and responsive

### Phase 3 Complete
- [x] Can generate complete dashboards from ioBroker enums
- [x] Device names are meaningful (not generic state names)
- [x] AI can generate dashboards via natural language

This implementation plan provides a clear roadmap prioritizing foundational systems before building advanced features, ensuring a stable and maintainable codebase.