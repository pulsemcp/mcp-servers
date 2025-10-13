# Changelog

All notable changes to the Claude Code Agent MCP Server will be documented in this file.

## [Unreleased]

### Fixed

- Added comprehensive debug logging to server installation process for better troubleshooting
  - Added debug logs to installer.ts covering configuration loading, secrets, and inference flow
  - Added debug logs to inference.ts for prompt generation, Claude calls, and response parsing
  - Added detailed debug logs to claude-client-adapter.ts including process spawning, stdin/stdout/stderr handling, and JSON parsing
  - Debug logs now show exact command arguments, working directories, and data flow through the installation pipeline
  - Fixed argument order in claude-client-adapter.ts to ensure `-p` flag comes before prompt for proper non-interactive mode

## [0.0.5] - 2025-10-13

**BREAKING: Remove serverConfigs parameter from install_servers tool**

- **BREAKING**: Removed the `server_configs` parameter from the `install_servers` tool
- Users should now configure servers exclusively via environment variables instead
- This simplifies the tool interface and encourages proper configuration management
- No backwards compatibility provided as explicitly requested

**Technical Changes:**

- Updated `IClaudeCodeClient.installServers` interface to remove `serverConfigs` parameter
- Modified `convertLegacyContext` function to not expect serverConfigs
- Updated all test mocks and functional tests to match new interface
- Restored `setup-dev.js` file needed for proper workspace symlink creation during builds
- All 73 tests still pass after parameter removal

## [0.0.4] - 2025-10-10

**CRITICAL FIX:**

- Restored missing `prepare-publish.js` file that was accidentally deleted during the directory architecture refactoring
- The prepare-publish.js script is essential for building and bundling the package correctly for npm publication
- Without this file, the `prepublishOnly` script fails and prevents proper package releases

**Technical Details:**

This restores the prepare-publish.js file that was accidentally removed in the directory architecture refactoring commit (1a5f484). The script handles TypeScript compilation, shared directory setup, and file copying for npm publishing. This fix ensures the claude-code-agent server can be properly built and published.

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
