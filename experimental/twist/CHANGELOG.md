# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
