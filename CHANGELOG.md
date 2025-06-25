# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2025-06-25

### Added

#### Core Features
- **ioBroker Dashboard CLI** - Complete command-line interface for dashboard management
- **AI-Powered Commands** - Natural language interface using Claude AI with structured function calls
- **Real-time Data Visualization** - Live updates from ioBroker instances via WebSocket
- **Visual Elements Library** - Comprehensive set of dashboard components

#### Dashboard Management
- **Column-based Layout System** - Responsive layouts with configurable columns (1-8)
- **User Data Directory** - Organized storage in `~/.iobroker-dashboard-cli/`
- **Dashboard Configuration Management** - Save/load multiple dashboard layouts
- **Settings Management** - Unified settings with dot notation support
- **Theme System** - Multiple built-in themes with customization support

#### Visual Elements
- **Visual Slider Element** - Interactive range controls with real-time updates
- **Status Header** - Real-time connection and dashboard statistics display
- **Gauge Elements** - Circular progress indicators for numeric values
- **Switch/Button Controls** - Interactive on/off toggles and action triggers
- **Text/Number Displays** - Formatted value presentations

#### AI Integration
- **AI Local Tools Registry** - 8 structured function tools for dashboard operations:
  - `add_dashboard_element` - Add elements to groups
  - `create_dashboard_group` - Create new groups  
  - `save_dashboard` / `load_dashboard` - Configuration management
  - `list_dashboard_configs` - List available dashboards
  - `get_dashboard_status` - Dashboard statistics
  - `remove_dashboard_element` - Remove elements
  - `move_group` - Reorder groups
- **Tool Routing System** - Intelligent routing between local and MCP tools
- **Enhanced System Prompts** - Emphasis on function calls over text commands

#### Commands System
- **Unified /set Command** - Configuration management with validation
- **Flag-based Command Syntax** - Modern CLI argument parsing
- **Command Registry** - Extensible command system with help integration
- **Interactive Help System** - Context-aware assistance

#### Technical Infrastructure
- **Test-Driven Development** - Comprehensive test suite with 103+ passing tests
- **Visual Regression Testing** - Terminal output consistency validation
- **ES Modules Support** - Modern JavaScript module system
- **Cross-platform Compatibility** - Linux, macOS, and Windows support

### Technical Details

#### Architecture
- **Modular Design** - Separation of concerns with clear component boundaries
- **Event-driven Updates** - Real-time data synchronization
- **Plugin Architecture** - Extensible system for custom elements and tools
- **Memory Efficient** - Optimized for long-running CLI sessions

#### Testing
- **Unit Tests** - 70+ unit tests covering individual components
- **Integration Tests** - End-to-end testing with mock ioBroker instances  
- **Visual Regression Tests** - Terminal output consistency validation
- **Coverage Reporting** - Comprehensive test coverage analysis

#### Dependencies
- `@anthropic-ai/sdk` ^0.54.0 - Claude AI integration
- `@modelcontextprotocol/sdk` ^1.13.0 - MCP protocol support
- `socket.io-client` ^2.5.0 - Real-time ioBroker communication
- `clui` ^0.3.6 - Terminal UI components
- `dotenv` ^16.5.0 - Environment configuration

### Development Tools

#### GitHub Actions CI/CD
- **Multi-Node.js Testing** - Node.js 18, 20, 22 compatibility
- **Cross-platform Testing** - Ubuntu, Windows, macOS validation
- **Security Scanning** - CodeQL analysis and vulnerability detection
- **Automated Releases** - GitHub and npm publishing workflow
- **Dependency Management** - Dependabot with auto-merge for minor updates

#### Quality Assurance
- **Test Coverage Reporting** - Codecov integration
- **Package Validation** - Installation and functionality testing
- **Documentation Checks** - Automated documentation validation
- **Security Auditing** - Regular dependency vulnerability scanning

### Breaking Changes
- None (initial release)

### Deprecated
- None (initial release)

### Removed
- None (initial release)

### Fixed
- None (initial release)

### Security
- **Input Validation** - All user inputs properly validated
- **Environment Variable Security** - Safe handling of API keys
- **Dependency Auditing** - Regular security vulnerability scanning
- **No Secrets in Code** - Proper separation of configuration and code

---

## Version History

### Development Milestones

1. **Test Framework Setup** - Established TDD workflow with Mocha/Chai
2. **Core Architecture** - Built foundational components and module system
3. **User Data Management** - Implemented configuration and settings system
4. **Column Layout System** - Added responsive layout engine
5. **Visual Elements** - Created component library with theming
6. **AI Integration** - Implemented Local Tools and Claude AI integration
7. **CI/CD Pipeline** - Set up comprehensive GitHub Actions workflows

### Technical Achievements

- **103 Passing Tests** - Comprehensive test coverage across all components
- **Cross-platform Support** - Validated on multiple operating systems
- **Performance Optimized** - Fast startup and responsive user interactions
- **Memory Efficient** - Optimized for long-running CLI sessions
- **Extensible Architecture** - Plugin system for custom components

### Future Roadmap

See `*_SPEC.md` files for detailed specifications of planned features:
- Number input elements with validation
- Visual gauge elements with customization
- Auto dashboard generation for common use cases
- Role-based filtering for large ioBroker installations
- Temperature dashboard templates

---

*For detailed technical specifications and architectural decisions, see the specification files (`*_SPEC.md`) in the repository root.*