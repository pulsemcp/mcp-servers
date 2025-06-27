# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2025-06-27

### Added

- Rich message content display in `get_thread` tool:
  - Action buttons with types (open_url, prefill_message, send_reply)
  - File attachments with metadata (size, type, dimensions)
  - Emoji reactions with user counts
  - System messages with detailed information
- Comprehensive type definitions for ActionButton, Attachment, SystemMessage, and enhanced Message interface
- Test coverage for all new message metadata fields

### Changed

- Enhanced `get_thread` tool output to display all available message metadata
- Updated Message interface to include optional fields for actions, attachments, reactions, and system_message

## [0.1.1+pagination] - 2025-06-27

### Added

- Pagination support for `get_threads` tool with `limit` and `offset` parameters
- Pagination support for `get_thread` tool with `message_limit` and `message_offset` parameters
- Filtering support for `get_threads` tool with `include_closed` parameter to optionally show closed threads
- Detection of closed threads based on the `closed` property from Twist API
- New `close_thread` tool to close threads with an optional closing message

### Changed

- Default behavior of `get_threads` now excludes closed threads (breaking change for those expecting all threads)
- Reduced default thread limit from 50 to 10 to minimize API calls
- Updated tool descriptions to clarify pagination and filtering behavior

## [0.1.1] - 2025-06-27

### Fixed

- Updated package name from `mcp-server-twist` to `twist-mcp-server` to follow correct naming convention
- Fixed import statements to use new package name
- Added missing `stage-publish` script to package.json

## [0.1.0] - 2025-06-27

### Added

- Initial release of Twist MCP Server
- Twist API client with Bearer token authentication
- Six tools for Twist integration:
  - `get_channels`: List all channels in workspace
  - `get_channel`: Get specific channel details
  - `get_threads`: List threads in a channel
  - `get_thread`: Get thread with messages
  - `create_thread`: Create new thread in channel
  - `add_message_to_thread`: Add message to existing thread
- Comprehensive test coverage:
  - 13 functional tests with mocked dependencies
  - 12 integration tests with mocked API
  - 11 manual tests for real API verification
- Environment variable configuration:
  - `TWIST_BEARER_TOKEN` for authentication
  - `TWIST_WORKSPACE_ID` for workspace selection
- Full CI/CD integration with GitHub Actions
- Documentation for setup and usage
