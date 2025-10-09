# Changelog

All notable changes to the Claude Code Agent MCP Server will be documented in this file.

## [Unreleased]

## [0.0.2] - 2025-10-08

**CRITICAL FIX:**

- Added missing `prepare-publish.js` script that caused the 0.0.1 release to be published without any compiled JavaScript files
- Updated `prepublishOnly` script to properly build and bundle the package before publishing
- The npm package now correctly includes the `build/` directory with all executable code

**Technical Details:**

This fix resolves the issue where `npx claude-code-agent-mcp-server` would fail with "command not found" because the published package only contained README.md and package.json. The package now includes all necessary files for execution.

## [0.0.1] - 2025-10-04

Initial release of the Claude Code Agent MCP Server - an agentic MCP configuration solution that solves the "tool overload" problem by enabling dynamic Claude Code subagent spawning with only relevant MCP servers.

**Core Features:**

- 7 tools for managing Claude Code subagents (`init_agent`, `find_servers`, `install_servers`, `chat`, `inspect_transcript`, `stop_agent`, `get_server_capabilities`)
- 2 resources for agent state monitoring (Subagent State and Transcript)
- Automatic server discovery based on task requirements
- Claude CLI integration with session continuation support
- Comprehensive testing infrastructure (functional, integration, and manual tests)
- Environment variable validation and error handling
- Mock Claude Code client for development and testing
