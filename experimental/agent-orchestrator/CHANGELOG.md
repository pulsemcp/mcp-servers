# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.3] - 2026-04-11

### Changed

- Internal: verify automated distribution pipeline (retry with gh CLI fix)

## [0.6.2] - 2026-04-11

### Changed

- Internal: verify automated distribution pipeline (retry with path fix)

## [0.6.1] - 2026-04-11

### Changed

- Internal: verify automated distribution pipeline

## [0.6.0] - 2026-04-11

### Changed

- **BREAKING:** Replaced `git_root`, `branch`, and `subdirectory` parameters on `start_session` tool with `agent_root`. The API resolves git_root, branch, subdirectory, default_model, and other defaults from the agent root configuration. This ensures sessions inherit the correct model and settings from the agent root.
- Simplified `ALLOWED_AGENT_ROOTS` validation to match by agent root name instead of git_root/branch/subdirectory combination.

### Removed

- `git_root` parameter from `start_session` tool (use `agent_root` instead)
- `branch` parameter from `start_session` tool (use `agent_root` instead)
- `subdirectory` parameter from `start_session` tool (use `agent_root` instead)

## [0.5.1] - 2026-04-11

### Added

- `plugins` parameter on `start_session` tool — an optional array of plugin name strings, remapped to `catalog_plugins` for the Rails API.
- `get_session` tool displays `catalog_plugins` (plugins) in the Execution section of session details.
- `catalog_plugins` optional field on `Session` type to surface plugins assigned to a session.

## [0.5.0] - 2026-04-08

### Added

- `update_title` action on `action_session` tool — update the title of a session. Requires the `title` parameter.
- `updateSession` client method used for title updates (calls `PATCH /sessions/:id`)

## [0.4.9] - 2026-04-07

### Fixed

- `start_session` tool's `skills` parameter was silently dropped by the Rails API because the orchestrator client sent `skills` but the API's strong params only permits `catalog_skills`. The client now remaps `skills` → `catalog_skills` before sending.

### Added

- `get_session` tool now displays `catalog_skills` (skills) in the Execution section of session details, alongside MCP Servers.
- `catalog_skills` optional field on `Session` type to surface skills assigned to a session.

## [0.4.8] - 2026-04-03

### Added

- `change_model` action on `action_session` tool — update the model (e.g., "opus-latest", "sonnet-latest") for an active session. Requires the `model` parameter.
- `model` parameter on `action_session` tool schema for the `change_model` action
- `changeModel` method on the orchestrator client, calling `PATCH /sessions/:id/model`
- `default_model` field on `AgentRootInfo` type and `get_configs` output — shows the default model configured for each agent root

## [0.4.7] - 2026-03-12

### Changed

- `get_session` tool now returns the transcript file path (e.g. `~/.claude/projects/*/{session_id}.jsonl`) when `include_transcript` is not set to true, with tips on efficiently reading specific sections via grep/tail instead of loading the entire transcript into context
- Updated `include_transcript` parameter description to warn about large transcripts and recommend using the file path for targeted reads

## [0.4.6] - 2026-03-11

### Added

- `skills` parameter on `start_session` tool — an optional array of skill name strings, passed through to the Agent Orchestrator API when creating sessions. Skills are not constrained by `ALLOWED_AGENT_ROOTS`.
- `start_session` tool description now includes guidance about passing `default_mcp_servers` and `default_skills` from agent roots
- `get_configs` usage notes now include guidance about passing `default_skills` via the `skills` parameter

## [0.4.5] - 2026-03-11

### Fixed

- `start_session` now resolves the `stop_condition` ID to its full description before passing it to the agent. Previously, only the opaque ID (e.g. `"pr_merged"`) was sent, leaving the agent without meaningful context about when to stop.

## [0.4.4] - 2026-03-11

### Added

- `default_skills` field is now included in `get_configs` tool response for agent roots. Previously, the `default_skills` configured on agent roots in Agent Orchestrator were silently dropped during the API response mapping.

## [0.4.3] - 2026-03-10

### Changed

- Clarified `needs_input` session status description in tool descriptions to indicate it is the normal idle/completed state after a session finishes work, not necessarily a blocked state requiring user intervention

## [0.4.2] - 2026-03-10

### Fixed

- `ALLOWED_AGENT_ROOTS` validation now uses `subdirectory` and `branch` to disambiguate when multiple allowed agent roots share the same `git_root`. Previously, `.find()` always returned the first match, causing incorrect MCP server validation for monorepo setups with multiple subagent roots.

## [0.4.1] - 2026-03-10

### Changed

- Improved `start_session` tool's `subdirectory` parameter description to clarify it should match a preconfigured agent root, not point at arbitrary internal directories in a monorepo
- Added usage note in `get_configs` output explaining how `default_subdirectory` from agent roots maps to `start_session`'s `subdirectory` parameter

## [0.4.0] - 2026-03-09

### Added

- `ALLOWED_AGENT_ROOTS` environment variable: comma-separated list of agent root names that constrains the server to only allow those specific preconfigured agent root invocations
  - `get_configs` filters out agent roots not in the allowed list
  - `start_session` rejects requests with non-allowed agent roots or non-default MCP server configurations
  - `action_session` blocks the `change_mcp_servers` action when restrictions are active
  - `action_trigger` blocks `create` and `update` actions when restrictions are active
  - When set, sessions can only be started with the exact default MCP servers defined for each allowed agent root (no more, no less)

## [0.3.0] - 2026-02-23

### Changed

- **BREAKING:** Renamed `search_sessions` tool to `quick_search_sessions` to clarify that it only searches session titles, not transcript contents
- **BREAKING:** Removed `search_contents` parameter from `quick_search_sessions` tool — it consistently errored due to data volume and was not functional
- Updated `quick_search_sessions` tool description to clearly communicate title-only search scope
- Default test target changed from production to staging (`https://ao.staging.pulsemcp.com`)
- Manual tests now fall back to staging URL when `AGENT_ORCHESTRATOR_BASE_URL` is not set
- Updated `.env.example`, test docs, and CONTRIBUTING.md to reference staging

### Fixed

- Fixed `getTranscript` failing with "No number after minus sign in JSON" error when using `transcript_format: 'text'` — the API returns raw text, not JSON, which requires `response.text()` instead of `response.json()`

## [0.2.5] - 2026-02-22

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
- Comprehensive functional tests for all 14 tools and tool group filtering

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
