# Changelog

All notable changes to the Hatchbox MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `deleteEnvVars` tool to delete one or more environment variables
- Support for batch deletion of environment variables via the Hatchbox API

### Changed

- Updated `setEnvVar` to always report "Successfully set" instead of distinguishing between create/update since we cannot check existing values
- Documentation updated to clarify that retrieving environment variables is only possible through the Hatchbox web dashboard

### Removed

- **BREAKING**: Removed `getEnvVars` and `getEnvVar` tools as these operations are not supported by the Hatchbox API

### Fixed

- API compatibility: The Hatchbox API does not provide a GET endpoint for environment variables, only PUT and DELETE

## [0.0.1] - TBD

### Added

- Initial release of Hatchbox MCP Server
- Environment variable management tools:
  - `setEnvVar` - Set or update an environment variable
  - `deleteEnvVars` - Delete one or more environment variables
- Deployment management tools:
  - `triggerDeploy` - Trigger a deployment (latest or specific commit)
  - `checkDeploy` - Check the status of a deployment
- Comprehensive test suite (functional, integration, and manual tests)
- Full documentation and usage examples
