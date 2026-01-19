# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-01-19

### Changed

- Updated README to use npx installation method instead of local build instructions
- Renamed `mcp_config` parameter to `mcp_json` in `run_exam` tool for consistency

### Removed

- **BREAKING**: `save_result` tool - result saving is now handled externally
- **BREAKING**: `get_prior_result` tool - prior result retrieval is now handled externally
- `mcp_server_slug` and `mcp_json_id` parameters from `run_exam` tool - decoupled from internal identifiers

## [0.1.0] - 2025-01-18

### Added

- Initial release of Proctor MCP Server
- `get_proctor_metadata` tool - Get available runtimes and exams
- `run_exam` tool - Execute Proctor exams against MCP servers
- `save_result` tool - Save exam results for future comparison
- `get_prior_result` tool - Retrieve previous exam results
- `get_machines` tool - List active Fly.io machines
- `destroy_machine` tool - Delete Fly.io machines
- `cancel_exam` tool - Cancel running exams
- Tool groups support (exams, machines) with read-only variants
- Integration tests with mock client
- Functional unit tests
