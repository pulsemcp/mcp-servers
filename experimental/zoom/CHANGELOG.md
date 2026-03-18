# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.0]

### Added

- Initial Zoom MCP server implementation with 3 tools:
  - `list_meetings` - List Zoom meetings for the authenticated user
  - `get_meeting` - Get details for a specific meeting by ID
  - `list_recordings` - List cloud recordings within a date range
- Functional tests with mocked Zoom client
- Integration tests using TestMCPClient with mock data
- GitHub Actions CI workflow (functional + integration tests)
- E2E STATE.md documenting external Zoom account requirements
