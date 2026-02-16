# Changelog

All notable changes to the Google Calendar Workspace MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.7] - 2026-02-16

### Fixed

- Event times now display correctly in the event's timezone instead of the server's local timezone
  - Previously, UTC times were displayed as-is but labeled with the event's timezone (e.g., an 8:59 AM PST event showed as 4:59 PM labeled as America/Los_Angeles)
  - Now uses `Intl.DateTimeFormat` with the event's timezone to show the correct local time
  - Affects `create_calendar_event`, `update_calendar_event`, `get_calendar_event`, `list_calendar_events`, and `query_calendar_freebusy` tools

## [0.0.6] - 2026-01-25

### Changed

- Response times now include timezone information when available (e.g., `4/1/2026, 2:04:00 PM (America/Los_Angeles)`)
  - Applies to `create_calendar_event`, `update_calendar_event`, `list_calendar_events`, `get_calendar_event`, and `query_calendar_freebusy` tools
  - Helps clarify which timezone event times are displayed in

## [0.0.5] - 2026-01-24

### Added

- File attachments support for `create_calendar_event` and `update_calendar_event` tools
  - Allows attaching files to calendar events via URL (e.g., Google Drive links, or any public URL)
  - Maximum 25 attachments per event
  - Automatically sets `supportsAttachments=true` query parameter when attachments are provided

## [0.0.4] - 2026-01-24

### Added

- `update_calendar_event` tool for updating existing events with PATCH semantics (only provided fields are updated)
- `delete_calendar_event` tool for deleting events with optional notification to attendees

### Changed

- **BREAKING**: Renamed all tools for cleaner, more consistent naming:
  - `gcal_list_events` → `list_calendar_events`
  - `gcal_get_event` → `get_calendar_event`
  - `gcal_create_event` → `create_calendar_event`
  - `gcal_list_calendars` → `list_calendars`
  - `gcal_query_freebusy` → `query_calendar_freebusy`
- Updated tool counts: 7 total tools (4 readonly, 7 readwrite)

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
