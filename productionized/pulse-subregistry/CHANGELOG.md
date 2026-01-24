# Changelog

All notable changes to the Pulse Sub-Registry MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Output format changed from Markdown to raw JSON for easier debugging and inspection of API responses

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
