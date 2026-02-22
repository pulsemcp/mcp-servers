# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `get_transcript_archive` tool to get the download URL and metadata for the transcript archive zip file (sessions, read)
- 7 new tools covering ~30 new API endpoints across 4 domains (14 tools total):
  - `manage_enqueued_messages` - Manage session message queue (list, get, create, update, delete, reorder, interrupt)
  - `get_notifications` - Get/list notifications and badge count
  - `action_notification` - Mark read, dismiss notifications (mark_read, mark_all_read, dismiss, dismiss_all_read)
  - `search_triggers` - Search/list automation triggers with optional channels
  - `action_trigger` - Create, update, delete, toggle triggers
  - `get_system_health` - Get system health report and CLI status
  - `action_health` - System maintenance actions (cleanup_processes, retry_sessions, archive_old, cli_refresh, cli_clear_cache)
- 2 new tool groups: `triggers`/`triggers_readonly` and `health`/`health_readonly`
- Extended `action_session` with 6 new actions: fork, refresh, refresh_all, update_notes, toggle_favorite, bulk_archive
- Extended `get_session` with `transcript_format` parameter (text/json) for dedicated transcript endpoint
- ~25 new API client methods for enqueued messages, triggers, notifications, health, and CLI operations
- Comprehensive functional tests for all 13 tools and tool group filtering

### Changed

- **BREAKING:** Replaced `ENABLED_TOOLGROUPS` environment variable with `TOOL_GROUPS` for consistency with other MCP servers in the repo
- **BREAKING:** Replaced permission-based tool groups (`readonly`, `write`, `admin`) with domain-specific tool groups (`sessions`, `sessions_readonly`, `notifications`, `notifications_readonly`, `triggers`, `triggers_readonly`, `health`, `health_readonly`) following the base/readonly pattern used by other MCP servers
- `action_session` `session_id` parameter is now optional (not required for `refresh_all` and `bulk_archive` actions)
- Default behavior unchanged: all tools enabled when `TOOL_GROUPS` is not set

## [0.2.4] - 2026-02-21

### Changed

- Updated `start_session` tool's `title` parameter description to strongly encourage always setting a title

## [0.2.3] - 2026-02-20

### Added

- New `send_push_notification` tool to send push notifications to users about sessions needing attention
- `sendPushNotification` method on the API client (`POST /api/v1/notifications/push`)
- Manual tests for `send_push_notification` and `get_configs` tools
- Updated manual test assertions for `Resources` and `action_session` to match current prod API behavior

## [0.2.2] - 2026-02-20

### Fixed

- Fixed `get_configs` returning `undefined` for agent root `git_root` and `title` fields by mapping the API response field names (`url` → `git_root`, `display_name` → `title`, `subdirectory` → `default_subdirectory`)

## [0.2.1] - 2026-01-18

### Changed

- Updated `start_session` tool description to prominently encourage calling `get_configs` first to see available MCP servers, stop conditions, and preconfigured agent roots

## [0.2.0] - 2026-01-18

### Added

- New `get_configs` tool to fetch all static configuration in a single call:
  - MCP servers (name, title, description)
  - Agent roots (preconfigured repository settings with defaults)
  - Stop conditions (session completion criteria)
- Unified configs endpoint support via new `getConfigs()` client method (uses `/api/v1/configs`)
- New MCP resources for individual config types:
  - `agent-orchestrator://configs/mcp-servers` - List of available MCP servers
  - `agent-orchestrator://configs/agent-roots` - Preconfigured repository settings
  - `agent-orchestrator://configs/stop-conditions` - Session completion criteria
- Shared caching between `get_configs` tool and config resources

### Removed

- **BREAKING:** `get_available_mcp_servers` tool removed - use `get_configs` tool or `agent-orchestrator://configs/mcp-servers` resource instead

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
