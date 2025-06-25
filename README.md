# ioBroker Dashboard CLI

[![CI](https://github.com/your-username/iobroker-dashboard-cli/workflows/CI/badge.svg)](https://github.com/your-username/iobroker-dashboard-cli/actions)
[![Coverage](https://codecov.io/gh/your-username/iobroker-dashboard-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/your-username/iobroker-dashboard-cli)
[![npm version](https://badge.fury.io/js/iobroker-dashboard-cli.svg)](https://badge.fury.io/js/iobroker-dashboard-cli)

A powerful command-line interface for managing ioBroker dashboards with AI-powered natural language commands, real-time data visualization, and extensive customization options.

## ✨ Features

- **🤖 AI-Powered Commands**: Natural language interface using Claude AI
- **📊 Real-time Dashboards**: Live data visualization from ioBroker
- **🎨 Visual Elements**: Gauges, sliders, switches, and custom components
- **⚡ Fast & Responsive**: Optimized terminal rendering with smooth updates
- **🔧 Highly Configurable**: Themes, layouts, and personalized settings
- **🏗️ Extensible Architecture**: Plugin system for custom elements and tools
- **📱 Cross-Platform**: Works on Linux, macOS, and Windows

## 🚀 Quick Start

### Installation

```bash
npm install -g iobroker-dashboard-cli
```

### Basic Usage

```bash
# Start the dashboard
iobroker-dashboard

# Or use the short alias
iobd
```

### First-time Setup

The CLI will guide you through initial configuration:

1. **ioBroker Connection**: Configure your ioBroker instance URL
2. **Dashboard Layout**: Choose columns and visual preferences  
3. **AI Integration**: Optionally set up Claude AI for natural language commands
4. **Theme Selection**: Pick from built-in themes or create custom ones

## 📖 Documentation

### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `/help` | Show all available commands | `/help` |
| `/add` | Add dashboard elements | `/add -g "Living Room" -n "Temperature" -s "hm-rpc.0.temp" -t "gauge"` |
| `/theme` | Change themes | `/theme -s "matrix"` |
| `/save` | Save dashboard configuration | `/save -f "my-dashboard"` |
| `/load` | Load dashboard configuration | `/load -f "my-dashboard"` |
| `/set` | Configure settings | `/set layout.columns 3` |

### AI Commands

With AI integration enabled, use natural language:

```
"Add a temperature gauge for the living room"
"Switch to dark theme"
"Create a group for kitchen devices"
"Show me all available sensors"
```

### Dashboard Elements

- **Gauge**: Circular progress indicators for numeric values
- **Slider**: Interactive range controls with real-time updates
- **Switch**: On/off toggle controls
- **Button**: Action triggers for scenes and scripts
- **Indicator**: Status lights and boolean displays
- **Text**: String value displays with formatting
- **Number**: Numeric displays with units and precision

## 🏗️ Architecture

### Core Components

```
├── AI Service          # Claude AI integration & tool routing
├── Dashboard Tools     # Element management & data binding
├── Layout Engine       # Responsive column-based layouts
├── Visual Elements     # Component library (gauges, sliders, etc.)
├── Config Manager      # Settings & dashboard persistence
├── ioBroker Client    # Real-time data synchronization
├── MCP Integration    # Model Context Protocol for AI tools
└── Terminal Renderer  # Optimized display & user interaction
```

### AI Local Tools

The CLI includes local tools for AI-powered dashboard management:

- `add_dashboard_element` - Add elements to groups
- `create_dashboard_group` - Create new groups
- `save_dashboard` / `load_dashboard` - Configuration management
- `get_dashboard_status` - Dashboard statistics
- `remove_dashboard_element` - Remove elements
- `move_group` - Reorder groups

## ⚙️ Configuration

### User Data Directory

Settings and dashboards are stored in `~/.iobroker-dashboard-cli/`:

```
~/.iobroker-dashboard-cli/
├── settings.json          # Global settings
├── dashboards/
│   ├── default.json       # Default dashboard
│   ├── kitchen.json       # Custom dashboards
│   └── ...
└── themes/
    └── custom-theme.json  # Custom themes
```

### Settings

Configure via `/set` command or edit `settings.json`:

```json
{
  "layout": {
    "columns": 4,
    "padding": 2,
    "showBorders": true
  },
  "theme": "default",
  "ai": {
    "enabled": true,
    "provider": "anthropic"
  }
}
```

### Environment Variables

```bash
# AI Integration
ANTHROPIC_API_KEY=your_claude_api_key
CLAUDE_API_KEY=your_claude_api_key  # Alternative

# ioBroker Connection
IOBROKER_URL=http://192.168.1.100:8081
IOBROKER_MCP_URL=http://192.168.1.100:8081/mcp
```

## 🧪 Development

### Prerequisites

- Node.js 18.x or higher
- npm 9.x or higher

### Setup

```bash
git clone https://github.com/your-username/iobroker-dashboard-cli.git
cd iobroker-dashboard-cli
npm install
```

### Testing

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:visual

# Test with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test-Driven Development

This project follows strict TDD practices:

1. Write tests first
2. See them fail (red)
3. Write minimal code to pass (green)
4. Refactor while keeping tests green
5. Commit only when all tests pass

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🔧 Troubleshooting

### Common Issues

**Connection Issues**
```bash
# Check ioBroker accessibility
curl http://your-iobroker-ip:8081/adapter/admin/upload.png

# Verify WebSocket connection
npm run test:integration
```

**Performance Issues**
```bash
# Check terminal compatibility
echo $TERM

# Reduce layout complexity
/set layout.columns 2
```

**AI Commands Not Working**
```bash
# Verify API key
echo $ANTHROPIC_API_KEY

# Check AI service status
/status
```

## 📊 Testing & Quality

- **103 passing tests** with comprehensive coverage
- **Visual regression testing** for UI consistency  
- **Integration testing** with real ioBroker instances
- **Cross-platform compatibility** testing
- **Performance benchmarking** for CLI responsiveness

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup and workflow
- Coding standards and best practices
- Test-driven development guidelines
- Pull request process
- Issue reporting templates

## 📄 License

ISC

## 🙏 Acknowledgments

- [ioBroker](https://www.iobroker.net/) - The amazing home automation platform
- [Anthropic Claude](https://claude.ai/) - AI-powered natural language processing
- [CLUI](https://github.com/nathanpeck/clui) - Terminal UI components
- [Mocha](https://mochajs.org/) & [Chai](https://www.chaijs.com/) - Testing framework

---

**Made with ❤️ for the ioBroker community**

*For detailed API documentation, architectural decisions, and feature specifications, see the `*_SPEC.md` files in the repository.*