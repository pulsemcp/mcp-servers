# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Fixed

- URL-encode meeting IDs in API calls to handle UUID-based IDs with special characters
- Include response body in API error messages for better debugging
- Include download URLs in `list_recordings` output
- Fix `clean` script to preserve source JS files in `scripts/` and `local/`
- Remove unused `ZoomUser` type and unnecessary re-export file

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
