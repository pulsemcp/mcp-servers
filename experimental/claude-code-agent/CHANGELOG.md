# Changelog

All notable changes to the Claude Code Agent MCP Server will be documented in this file.

## [Unreleased]

## [0.0.3] - 2025-10-10

**BREAKING CHANGES:**

- **BREAKING:** `init_agent` tool now requires `working_directory` parameter (absolute path)
- **BREAKING:** `init_agent` tool now accepts optional `agent_id` parameter for state directory naming
- **BREAKING:** Removed transcript resource (state resource now contains transcript path reference)

**Improvements:**

- Implemented directory separation: working directory (where agent operates) vs state directory (where state is stored)
- Fixed transcript path to point to Claude Code's native transcript files (`~/.claude/projects/{project-dir}/{session-id}.jsonl`)
- Enhanced path transformation logic to match Claude Code's naming convention for project directories
- Updated all tests to use new parameter structure and verify directory separation
- State storage now uses `CLAUDE_AGENT_BASE_DIR` exclusively with agent_id-based folder naming
- Improved security validation to allow both working and state directories

**Technical Details:**

This release addresses the fundamental directory structure issue where `/tmp/claude-agents` was being used for both agent operations and state storage. The new architecture cleanly separates:

- **Working Directory**: Where the Claude Code agent operates (user-specified via `working_directory` parameter)
- **State Directory**: Where state.json and other metadata are stored (`${CLAUDE_AGENT_BASE_DIR}/${agent_id}/`)
- **Transcript Path**: Points to Claude Code's native transcript files for seamless integration

Users upgrading from previous versions must update their `init_agent` calls to include the `working_directory` parameter.

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
