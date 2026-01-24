# Changelog

All notable changes to the Google Calendar Workspace MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3] - 2026-01-24

### Changed

- **BREAKING**: Renamed tool groups for consistency with other MCP servers:
  - `calendar` → `readwrite`
  - `calendar_readonly` → `readonly`
- **BREAKING**: Renamed environment variable from `TOOL_GROUPS` to `ENABLED_TOOLGROUPS` for consistency

## [0.0.2] - 2025-01-23

### Added

- Tool groups support with `calendar` and `calendar_readonly` groups
  - `calendar`: All tools enabled (read + write) - default behavior
  - `calendar_readonly`: Only read operations (excludes `gcal_create_event`)
- `TOOL_GROUPS` environment variable for configuring enabled tool groups
- `enabledToolGroups` option in `CreateMCPServerOptions` for programmatic configuration
- Integration tests for tool group filtering

## [0.0.1] - 2024-01-12

### Added

- Initial implementation of Google Calendar MCP server
- Service account authentication with domain-wide delegation
- `gcal_list_events` tool for listing calendar events
- `gcal_get_event` tool for retrieving event details
- `gcal_create_event` tool for creating new events
- `gcal_list_calendars` tool for discovering available calendars
- `gcal_query_freebusy` tool for checking availability
- Comprehensive test suite (functional, integration, and manual tests)
- Full documentation including setup guide and troubleshooting
