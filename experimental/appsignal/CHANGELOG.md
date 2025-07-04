# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
