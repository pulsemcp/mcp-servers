# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial implementation of Fly.io MCP server
- App management tools:
  - `list_apps` - List all Fly.io applications
  - `get_app` - Get details for a specific app
  - `create_app` - Create a new application
  - `delete_app` - Delete an application
- Machine management tools:
  - `list_machines` - List all machines in an app
  - `get_machine` - Get details for a specific machine
  - `create_machine` - Create a new machine with Docker image
  - `update_machine` - Update machine configuration
  - `delete_machine` - Delete a machine
  - `start_machine` - Start a stopped machine
  - `stop_machine` - Stop a running machine
- Tool grouping system for permission-based access control
  - `readonly` group for list/get operations
  - `write` group for create/update/start/stop operations
  - `admin` group for delete operations
- Environment variable validation at startup
- Health checks for API credential validation
- Comprehensive test suite (functional and integration tests)
