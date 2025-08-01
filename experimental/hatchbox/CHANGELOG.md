# Changelog

All notable changes to the Hatchbox MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2025-07-31

### Added

- Initial release of Hatchbox MCP Server
- Environment variable management tools:
  - `setEnvVar` - Set or update an environment variable
  - `deleteEnvVars` - Delete one or more environment variables
  - `getEnvVars` - SSH-based tool to retrieve all environment variables from the server
  - `getEnvVar` - SSH-based tool to retrieve specific environment variables from the server
- Deployment management tools:
  - `triggerDeploy` - Trigger a deployment (latest or specific commit)
  - `checkDeploy` - Check the status of a deployment
- Security features:
  - `READONLY` mode (default: true) to prevent accidental modifications
  - `ALLOW_DEPLOYS` permission (default: true) to control deployment access
  - Conditional tool surfacing based on configuration:
    - `getEnvVars` and `getEnvVar` only available when `WEB_SERVER_IP_ADDRESS` is configured
    - `setEnvVar` and `deleteEnvVars` only available when `READONLY=false`
    - `triggerDeploy` and `checkDeploy` only available when `ALLOW_DEPLOYS=true`
- Support for SSH key authentication with configurable key path
- Support for filtering processes by app name with `HATCHBOX_APP_NAME`
- Comprehensive test suite (functional, integration, and manual tests)
- Full documentation with SSH setup instructions and security best practices
