# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js ESM CLI tool for ioBroker dashboard management. The project uses ES modules (`"type": "module"`) and Socket.IO for real-time communication with ioBroker instances and CLUI for command-line user interface components.

## Development Commands

- `npm start` or `node index.js` - Start the dashboard application
- `npm test` - Run all tests (unit + integration + visual)
- `npm run test:unit` - Run unit tests only
- `npm run test:visual` - Run visual regression tests
- `npm run test:settings` - Run settings manager tests
- `npm install` - Install dependencies

## Main Entry Point

- **index.js** - Main dashboard application that integrates all components

## Dependencies

The project uses:
- `@anthropic-ai/sdk` (^0.54.0) - Anthropic Claude SDK for MCP chat client functionality
- `@modelcontextprotocol/sdk` (^1.13.0) - Model Context Protocol SDK for MCP integration
- `socket.io-client` (^4.8.1) - For connecting to ioBroker instances via WebSocket
- `clui` (^0.3.6) - For CLI user interface components (progress bars, spinners, etc.)

## Project Structure

The project is currently minimal with only package.json and dependencies installed. Main source files are expected to be created in the root directory as this is a CLI tool project.

## Key Integration Points

- **ioBroker Communication**: Uses Socket.IO client to connect to ioBroker instances at `http://192.168.178.38:8082`
- **MCP Server**: Connects to MCP server at `http://192.168.178.38:8082/mcp`
- **AI Integration**: Uses Claude via Anthropic SDK for AI-powered functionality
- **CLI Interface**: Interactive terminal dashboard with live data updates and command input
- **Configuration Management**: Save/load dashboard layouts with JSON persistence
- **Entry Point**: `index.js` - Main application that brings all components together

## Development Notes

- This is an ESM project - use `import`/`export` syntax instead of `require`/`module.exports`
- This appears to be a CLI tool for managing ioBroker dashboards remotely with AI assistance
- Socket.IO suggests real-time communication capabilities with ioBroker instances
- MCP integration enables AI-powered dashboard management and automation
- CLUI indicates rich terminal UI with progress bars, spinners, and interactive prompts
- All JavaScript files will be treated as ES modules by default
- Claude AI integration for intelligent dashboard management and automation

## Test-Driven Development Workflow (MANDATORY)

**CRITICAL**: From this point forward, ALL feature implementation MUST follow this exact workflow:

### 1. CREATE TEST FIRST
- Write a test that defines the desired behavior BEFORE implementing ANY feature
- Test should fail initially (red)
- Use appropriate test type: unit, integration, or visual regression

### 2. IMPLEMENT FEATURE  
- Write the minimum code to make the test pass
- Focus on making the test green, not perfect code
- Implement incrementally if the feature is complex

### 3. RUN TEST
- Verify the new test passes (`npm test`)
- Ensure no existing tests break
- Fix any regressions before proceeding

### 4. GIT COMMIT
- When feature or feature parts are complete and tested, immediately commit changes
- Use descriptive commit messages explaining what was implemented
- Include test results in commit message

### 5. INCREMENTAL COMMITS
- Commit frequently to enable rollback when something breaks
- Each commit should represent a working, tested state
- Never commit broken or untested code

**Example workflow:**
```bash
# 1. Write test for /set command
# 2. Implement SetCommand class
# 3. npm run test:commands
# 4. git add . && git commit -m "Implement /set command with validation tests"
```

This workflow is CRITICAL for code quality and rollback capability. Do NOT implement features without following this exact sequence.