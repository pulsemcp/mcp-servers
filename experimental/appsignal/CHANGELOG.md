# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2025-12-09

### Added

- New `get_performance_samples` tool for retrieving multiple recent samples for a controller action. Returns up to N samples (default 10) with detailed request info including path, params, and timing breakdown by component (active_record, action_view, etc.).
- New `get_metrics` tool for retrieving aggregated metrics like mean response time, P95, and request counts. Supports filtering by metric name, namespace, timeframe, and limit.
- New `get_metrics_timeseries` tool for retrieving time-series metrics data showing how metrics change over time. Returns data points with timestamps for both MEAN (average) and P95 (95th percentile) values, useful for identifying performance trends, spikes, or degradations.
- New `get_deploy_markers` tool for retrieving recent deployment markers to correlate performance issues and incidents with code deployments. Includes revision information, deployment time, deployer username, and exception counts per deployment.
- New `get_slow_requests` convenience tool that combines performance incident and sample data in a single call. Shows the slowest recent requests with full details including request paths, parameters, and timing breakdowns by component.

## [0.3.0] - 2025-10-08

### Changed

- Updated @modelcontextprotocol/sdk from 1.13.2 to 1.19.1

## [0.2.15] - 2025-09-09

### Added

- Added `mcpName` field to package.json with value `com.pulsemcp.servers/appsignal` for MCP registry compatibility

## [0.2.14] - 2025-07-07

### Fixed

- Fixed search_logs returning 400 errors when using `start` and `end` parameters. Implemented a workaround for an AppSignal API bug where these parameters cause 400 errors when passed as GraphQL variables. The parameters now work correctly by being hardcoded in the query string, allowing users to filter logs by time range.

### Added

- Manual test coverage specifically for the search_logs 400 error scenario
- Setup script (`test:manual:setup`) for easier manual testing environment preparation

### Improved

- Documentation for manual testing setup in new worktrees
- Monorepo workspace configuration for better dependency management

## [0.2.13] - 2025-07-04

### Fixed

- Fixed npm package permissions issue where `npx appsignal-mcp-server` would fail with "Permission denied" error by updating the `files` field in package.json to match the pattern used by twist-mcp-server

## [0.2.12] - 2025-07-03

### Added

- Manual testing infrastructure with MANUAL_TESTING.md tracking
- Scripts for running manual tests against built code

### Improved

- Test coverage now includes manual API integration tests
- CI workflow verifies manual test execution before version bumps

## [0.2.11] - 2025-07-03

### Changed

- Applied DRY (Don't Repeat Yourself) pattern to all tool parameter descriptions
  - Added `PARAM_DESCRIPTIONS` constants to maintain single source of truth
  - All 14 tool files now use consistent parameter descriptions
  - Separated Zod shape definitions from schema objects for better organization
  - Improves maintainability by eliminating description duplication

### Fixed

- Fixed integration test imports to use relative paths instead of package names
  - Updated `index.integration-with-mock.ts` to use '../shared/index.js' pattern
  - Follows monorepo workspace setup requirements for proper module resolution

## [0.2.10] - 2025-07-03

### Added

- Centralized logging infrastructure (`shared/src/logging.ts`) for MCP protocol compliance
- Logging functions: `logServerStart()`, `logError()`, `logWarning()`, `logDebug()`

### Changed

- Updated server startup to use `logServerStart()` instead of direct console.error
- Updated error handling to use `logError()` for better error context
- Updated environment validation to use proper logging functions
- Optional environment variable logging now uses `logDebug()` for cleaner output

### Fixed

- Ensured MCP protocol compliance by using stderr-only logging (stdout must contain only JSON)

## [0.2.9] - 2025-06-27

### Fixed

- Added missing graphql and graphql-request dependencies to local package.json
- This fixes runtime errors when running the server via npx or npm install

## [0.2.8] - 2025-06-27

### Fixed

- Fixed npm publish TypeScript build errors by reordering prepare-publish.js steps
- Build shared directory first before building local to ensure imports resolve correctly

## [0.2.7] - 2025-06-27

## [0.2.6] - 2025-06-27

## [0.2.5] - 2025-06-27

## [0.2.4] - 2025-06-27

## [0.2.3] - 2025-06-27

### Fixed

- Moved `bin` field from root package.json to local package.json for proper executable installation

## [0.2.2] - 2025-06-27

### Added

- Environment variable validation at server startup
  - Server now validates `APPSIGNAL_API_KEY` before starting
  - Documents optional `APPSIGNAL_APP_ID` variable
  - Provides clear error messages with descriptions when required variables are missing
  - Includes example export commands to help users fix configuration issues
  - Exits with error code 1 on validation failure
  - Logs informational message when APPSIGNAL_APP_ID is set

### Fixed

- Added missing `bin` field to package.json to enable proper executable installation via npx

## [0.2.1] - 2025-06-26

### Changed

- **BREAKING**: All incident-related tools now accept `incidentNumber` instead of `incidentId` parameter
- Updated API client to match incidents by their dashboard number (e.g., "79") instead of MongoDB ObjectIDs
- Fixed incorrect package naming from `mcp-server-appsignal` to `appsignal-mcp-server` throughout the codebase

### Fixed

- Improved ergonomics by allowing users to use incident numbers from AppSignal dashboard URLs

## [0.2.0] - 2025-06-26

### Fixed

- Resolved TypeScript 'any' type warnings in test files for better type safety
- Handled exception incident sample API limitation to prevent errors when API doesn't support sample data
- Fixed performance incidents API returning no results by switching to paginatedPerformanceIncidents query with proper state filtering

## [0.1.3] - 2025-06-26

### Added

- Added `prepare-npm-readme.js` script to automatically combine READMEs during npm publish
- Script merges main README with local configuration section for comprehensive npm documentation

### Changed

- Removed broken image link from main README
- Updated .gitignore to allow scripts/\*.js files for CI

## [0.1.2] - 2025-06-26

### Fixed

- Fixed npm publish workflow to use `npm install` instead of `npm ci`

## [0.1.1] - 2025-06-26

### Added

- Added npm publication configuration
- Added repository metadata to package.json
- Set up automated publishing workflow

### Fixed

- Fixed package naming to use `appsignal-mcp-server`

## [0.1.0] - 2025-06-26

### Added

- Initial release of AppSignal MCP server
- Support for searching logs
- Support for listing and viewing exception incidents
- Support for listing and viewing anomaly incidents
- Support for listing and viewing log incidents
- Integration with AppSignal GraphQL API
- Both local (stdio) and shared implementations
