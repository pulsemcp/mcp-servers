# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-01-18

### Added

- New `get_configs` tool to fetch all static configuration in a single call:
  - MCP servers (name, title, description)
  - Agent roots (preconfigured repository settings with defaults)
  - Stop conditions (session completion criteria)
- Unified configs endpoint support via new `getConfigs()` client method (uses `/api/v1/configs`)
- Shared caching between `get_configs` and `get_available_mcp_servers` tools

### Changed

- `get_available_mcp_servers` tool now uses the unified `/api/v1/configs` endpoint instead of `/api/v1/mcp_servers`
- Cache is now shared between `get_configs` and `get_available_mcp_servers` to avoid redundant API calls

## [0.1.3] - 2026-01-18

### Added

- New `get_available_mcp_servers` tool to list available MCP servers for use with `start_session`
- Results are cached in memory for the session with optional `force_refresh` parameter
- Updated `start_session` tool description to reference `get_available_mcp_servers`

## [0.1.2] - 2026-01-09

### Added

- API connectivity health check on startup to fail fast when REST API is unreachable
- `HEALTH_CHECK_TIMEOUT` environment variable to configure health check timeout (default: 10 seconds)
- Helpful error hints for common connection issues (auth failures, timeouts, connection refused, DNS errors)

## [0.1.1] - 2025-12-14

### Added

- New `change_mcp_servers` action in the `action_session` tool to update MCP servers for a session

### Changed

- Updated README to use npm package (`npx -y agent-orchestrator-mcp-server`) instead of local node build path

## [0.1.0] - 2025-12-12

### Added

- Initial implementation of agent-orchestrator MCP server
- Input validation for API client (baseUrl and apiKey cannot be empty)
- Request timeout configuration (default 30s) with AbortController
- Simplified 4-tool interface:
  - `search_sessions` - Search/list sessions with optional ID lookup, query, and filters
  - `start_session` - Create and start new agent sessions
  - `get_session` - Get detailed session info with optional logs and subagent transcripts (paginated)
  - `action_session` - Perform session actions (follow_up, pause, restart, archive, unarchive)
- Configuration resource at `agent-orchestrator://config`
- Tool grouping system (readonly, write, admin)
- Environment variable validation at startup
- Comprehensive test suite (functional and integration)
