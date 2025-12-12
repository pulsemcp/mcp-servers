# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial implementation of agent-orchestrator MCP server
- Session management tools:
  - `list_sessions` - List agent sessions with filtering and pagination
  - `get_session` - Get detailed session information with optional transcript
  - `create_session` - Create new agent sessions
  - `update_session` - Update session attributes
  - `delete_session` - Permanently delete sessions
  - `search_sessions` - Search sessions by query string
- Session lifecycle tools:
  - `follow_up` - Send follow-up prompts to paused sessions
  - `pause_session` - Pause running sessions
  - `restart_session` - Restart paused or failed sessions
  - `archive_session` - Archive sessions
  - `unarchive_session` - Restore archived sessions
- Log management tools:
  - `list_logs` - List logs for a session
  - `create_log` - Create log entries
- Subagent transcript tools:
  - `list_subagent_transcripts` - List subagent transcripts
  - `get_subagent_transcript` - Get detailed transcript info
- Configuration resource at `agent-orchestrator://config`
- Tool grouping system (readonly, write, admin)
- Environment variable validation at startup
- Comprehensive test suite (functional and integration)
