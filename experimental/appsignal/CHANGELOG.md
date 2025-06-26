# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2025-06-26

### Added

- Example proof-of-concept version bump with proper process

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
