# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js ESM CLI tool for ioBroker dashboard management. The project uses ES modules (`"type": "module"`) and Socket.IO for real-time communication with ioBroker instances and CLUI for command-line user interface components.

## Development Commands

- `npm start` or `node index.js` - Start the dashboard application
- `npm test` - No tests configured yet (placeholder script)
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