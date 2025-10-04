# Changelog

All notable changes to the Claude Code Agent MCP Server will be documented in this file.

## [Unreleased]

### Fixed

- Claude CLI integration now properly uses non-interactive mode with `-p` flag
- Session continuation now uses `--resume <session_id>` for proper context maintenance
- Process spawning now closes stdin immediately to prevent hanging
- State persistence fixed by maintaining single client instance across tool calls
- Session ID parsing updated to handle Claude's `session_id` field format

### Changed

- Default log level set to 'info' instead of 'debug' for cleaner output
- `find_servers` tool now optionally uses session context when available
- Updated `@modelcontextprotocol/sdk` to v1.19.1
- Added Inspector debugging command to CONTRIBUTING.md
- Updated .gitignore to exclude test session files and temp directories

### Added

- Initial implementation of Claude Code Agent MCP Server
- 7 tools for managing Claude Code subagents:
  - `init_agent` - Initialize a new Claude Code subagent with custom system prompt
  - `find_servers` - Discover relevant MCP servers based on task requirements
  - `install_servers` - Install selected MCP servers in the subagent
  - `chat` - Send prompts to the subagent and receive responses
  - `inspect_transcript` - View conversation history with the subagent
  - `stop_agent` - Gracefully shut down the subagent
  - `get_server_capabilities` - Query capabilities of available MCP servers
- 2 resources for agent state monitoring:
  - Subagent State (file://state.json) - Current agent status and configuration
  - Subagent Transcript (file://transcript.json) - Full conversation history
- Mock Claude Code client implementation for testing
- Comprehensive test suite:
  - 21 functional tests
  - 14 integration tests (8 passing, 6 with known limitations)
  - Manual test scenarios
- Environment variable validation
- Proper error handling with user-friendly messages
- Logging infrastructure using stderr

### Technical Details

- TypeScript implementation with ES modules
- Dependency injection pattern for testability
- Zod schemas for runtime validation
- MCP SDK integration following best practices
- Monorepo structure with shared/local separation
