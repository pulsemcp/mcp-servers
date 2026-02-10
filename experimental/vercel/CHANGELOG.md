# Changelog

All notable changes to the Vercel MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Vercel MCP server implementation
- Deployment management tools (readonly): `list_deployments`, `get_deployment`, `list_projects`, `get_deployment_events`
- Deployment management tools (readwrite): `create_deployment`, `cancel_deployment`, `delete_deployment`, `promote_deployment`, `rollback_deployment`
- Runtime log retrieval: `get_runtime_logs`
- Tool group system with `readonly` and `readwrite` groups via `VERCEL_ENABLED_TOOLGROUPS`
- Team-scoped operations via `VERCEL_TEAM_ID` and `VERCEL_TEAM_SLUG`
- Functional tests for all tools
- Integration tests with mocked Vercel API
- Manual test infrastructure for real API testing
- Validation that `gitRef`, `gitRepoId`, and `gitType` must all be provided together in `create_deployment`
- Warning logging for malformed runtime log lines
- `get_runtime_logs` now supports filtering by time range (`since`/`until`), search text, log source, level, HTTP status code, direction, limit, and environment

### Fixed

- Rollback deployment API endpoint uses correct version (`/v9` instead of `/v1`)
- Runtime logs `Accept` header uses `application/stream+json` for NDJSON format
- `ci:install` script properly installs dependencies in shared/local subdirectories
