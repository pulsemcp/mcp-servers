# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Renamed package from `@pulsemcp/slack-mcp-server` to `slack-workspace-mcp-server`
- Improved README setup section for better consistency with other MCP servers (added `-y` flag to npx)

## [0.0.1] - 2026-01-02

### Added

- Initial release of Slack MCP Server
- Core Slack client with authentication via Bot Token
- **Read-only tools:**
  - `slack_get_channels` - List all accessible channels
  - `slack_get_channel` - Get channel info with recent messages
  - `slack_get_thread` - Get thread with all replies
- **Write tools:**
  - `slack_post_message` - Post new messages to channels
  - `slack_reply_to_thread` - Reply to existing threads
  - `slack_update_message` - Update previously posted messages
  - `slack_react_to_message` - Add emoji reactions
- Tool group system for permission control (`readonly`, `write`)
- Functional and integration test suites
- Manual test suite for real API testing
