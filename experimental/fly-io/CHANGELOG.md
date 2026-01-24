# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Image management tools (via `fly` CLI):
  - `show_image` - Show current Docker image details for an app
  - `list_releases` - List releases with Docker image references
  - `update_image` - Update app's image to latest version or specific image
- `images` feature group for image management tools
- Docker registry tools for interacting with Fly.io's private registry (requires Docker CLI):
  - `push_new_fly_registry_image` - Push a local Docker image to Fly.io registry for use with machines
  - `pull_fly_registry_image` - Pull an image from Fly.io registry to local Docker
  - `check_fly_registry_image` - Check if an image exists in Fly.io registry
- `registry` feature group for Docker registry tools
- CLI availability health checks at startup for `fly` and `docker`
- `DISABLE_DOCKER_CLI_TOOLS` environment variable to opt out of Docker-based tools
  - When set, skips Docker health check and doesn't serve registry tools
  - Fails on startup if `registry` group is explicitly enabled but Docker is disabled

### Changed

- Increased `machine_exec` default timeout from 30s to 120s to allow longer-running commands
- Fixed integration test import path for test-mcp-client
- Registry tools automatically authenticate and clean up Docker config (no credential pollution)
- **BREAKING**: Refactored to use `fly` CLI instead of REST API
  - All operations now shell out to the `fly` command
  - Requires `fly` CLI to be installed and available in PATH
  - Provides consistency across all tools and enables CLI-only features
  - Uses `execFile` instead of `exec` to prevent command injection vulnerabilities

### Added

- `get_logs` tool - Retrieve application logs with region and machine filtering
- `machine_exec` tool - Execute commands on running machines
- Security considerations section in README documenting `machine_exec` risks
- `FLY_IO_APP_NAME` environment variable for app scoping
  - When set, disables app management tools (list_apps, get_app, create_app, delete_app)
  - Restricts all machine operations to the configured app
  - Makes app_name parameter optional (auto-injected)
  - Blocks cross-app operations with clear error messages
- Feature-based tool groups in addition to permission groups
  - `apps` group for app management tools
  - `machines` group for machine management tools
  - `logs` group for log retrieval tools
  - `ssh` group for remote execution tools
  - Groups can be combined (e.g., `ENABLED_TOOLGROUPS="readonly,machines"` for read-only machine access)
- Fail-closed behavior for invalid ENABLED_TOOLGROUPS configuration (throws error instead of enabling all tools)

## [0.1.0] - 2026-01-10

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
  - `get_machine_events` - Get event log for debugging
  - `create_machine` - Create a new machine with Docker image
  - `update_machine` - Update machine configuration
  - `delete_machine` - Delete a machine
  - `start_machine` - Start a stopped machine
  - `stop_machine` - Stop a running machine
  - `restart_machine` - Restart a machine (stop + start)
  - `suspend_machine` - Suspend a machine (save state)
  - `wait_machine` - Wait for machine to reach a state
- Tool grouping system for permission-based access control
  - `readonly` group for list/get operations
  - `write` group for create/update/start/stop/restart/suspend/wait operations
  - `admin` group for delete operations
- Environment variable validation at startup
- Health checks for API credential validation
- Comprehensive test suite (functional and integration tests)
