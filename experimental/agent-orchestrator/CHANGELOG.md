# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
