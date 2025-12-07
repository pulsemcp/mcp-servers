# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial template implementation

### Changed

- None yet

### Fixed

- None yet

### Breaking

- None yet

<!--
================================================================================
CHANGELOG TEMPLATE GUIDE
================================================================================

Use these section headers to categorize changes:

### Added
New features or functionality added to the server.
Example: "Added `search_items` tool with pagination support"

### Changed
Changes to existing functionality (non-breaking).
Example: "Improved error messages for API timeout errors"

### Fixed
Bug fixes.
Example: "Fixed pagination returning duplicate results"

### Deprecated
Features that will be removed in future versions.
Example: "Deprecated `legacy_search` tool - use `search_items` instead"

### Removed
Features that have been removed.
Example: "Removed deprecated `legacy_search` tool"

### Security
Security-related changes or fixes.
Example: "Fixed API key exposure in error logs"

### Breaking
Breaking changes that require user action.
Example: "**BREAKING**: Renamed parameter `incidentId` to `incidentNumber`"

================================================================================
VERSION ENTRY FORMAT
================================================================================

## [X.Y.Z] - YYYY-MM-DD

### Added
- Feature description with details
- Another feature

### Changed
- Change description

### Fixed
- Bug fix description (reference issue if available)

### Breaking
- **BREAKING**: Description of breaking change and migration steps

================================================================================
EXAMPLE ENTRIES
================================================================================

## [0.2.0] - 2025-01-15

### Added

- Added `search_items` tool for finding items by query
  - Supports pagination with `limit` and `offset` parameters
  - Results sorted by relevance score
  - Returns total count and `hasMore` indicator
- Added tool grouping system for permission-based access control
  - Configure via `ENABLED_TOOLGROUPS` environment variable
  - Groups: `readonly`, `write`, `admin`

### Changed

- Improved error messages to include API response details
- Updated parameter descriptions for clarity

### Fixed

- Fixed timeout not being respected in search operations
- Fixed pagination returning incorrect `hasMore` value

## [0.1.1] - 2025-01-10

### Fixed

- Fixed API key validation failing silently on startup
- Fixed config resource returning incorrect environment status

### Breaking

- **BREAKING**: Renamed `item_id` parameter to `id` in `get_item` tool
  - Migration: Update tool calls to use `id` instead of `item_id`

## [0.1.0] - 2025-01-01

### Added

- Initial release with core functionality
- `example_tool` for processing messages
- `search_items` tool for searching items
- Configuration resource at `NAME://config`
- Environment variable validation at startup
- Comprehensive logging to stderr

================================================================================
-->
