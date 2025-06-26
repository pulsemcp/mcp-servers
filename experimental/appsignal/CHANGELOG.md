# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
