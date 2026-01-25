# Changelog

All notable changes to the Pulse Sub-Registry MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.2] - 2026-01-25

### Added

- `switch_tenant_id` admin tool for changing the active tenant ID at runtime
  - Allows switching tenant context without restarting the server
  - Pass an empty string to clear the tenant ID
  - Disabled by default; enable with `SHOW_ADMIN_TOOLS=true` environment variable
- `latest_only` parameter to `list_servers` tool (default: `true`)
  - By default, only returns the latest version of each server
  - Set to `false` to include all versions
- Auto-truncation to reduce context size (truncated values are valid JSON strings, not partial content):
  - Strings longer than 200 characters are replaced with a message showing exact `expand_fields` path needed
  - Deep objects/arrays (depth >= 6) larger than 500 characters are replaced with a message (depth 5 keys remain visible)
- `expand_fields` parameter to `list_servers` and `get_server` tools for viewing full content of truncated fields
  - Uses dot-notation paths (e.g., `"servers[].server.description"`, `"server.readme"`)
  - Supports array notation `[]` to apply to all array elements

### Changed

- Output format changed from Markdown to raw JSON for easier debugging and inspection of API responses
- `list_servers` now includes full `_meta` information for each server entry (visitor stats, publication info, timestamps)

## [0.0.1] - 2026-01-24

### Added

- Initial implementation of pulse-subregistry MCP server
- `list_servers` tool for browsing MCP servers with search, pagination, and `updated_since` filtering
- `get_server` tool for retrieving detailed server information by name and version
- PulseMCP Sub-Registry API client with authentication support
- Proper handling of nested API response structure (server entries with `server` and `_meta` fields)
- Display of server titles alongside IDs for better readability
- Support for repository URLs as nested objects
- Comprehensive test suite (functional, integration, and manual tests)
- Full documentation with setup instructions and usage examples
- 30-second timeout handling for API requests
