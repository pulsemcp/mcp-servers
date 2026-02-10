# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial GCS MCP server implementation with feature parity to S3 MCP server
- Full bucket management: list, create, delete, head (existence check)
- Full object management: list, get, put, delete, copy
- Fine-grained access control with tool groups (readonly, readwrite)
- Individual tool enable/disable via GCS_ENABLED_TOOLS and GCS_DISABLED_TOOLS
- Single bucket constraint mode via GCS_BUCKET environment variable
- Multiple authentication methods: service account key file, inline JSON, Application Default Credentials
- Health checks at startup to validate credentials and bucket access
- Config resource at gcs://config for debugging server state
- Functional tests for all tools and tool filtering logic
- Integration tests with TestMCPClient and mock GCS client
- Manual tests for all operations against real GCS API
- CI workflow for automated testing
