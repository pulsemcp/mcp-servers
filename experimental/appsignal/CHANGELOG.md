# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.4] - 2025-06-27

### Fixed

- Resolved npm publish issues with workspace dependencies
  - Fixed "invalid or damaged lockfile" error when running via npx
  - Implemented build-time copying approach to handle shared workspace code
  - No bundler dependencies required

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
