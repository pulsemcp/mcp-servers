# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.6] - 2026-04-24

### Changed

- No-op patch bump to retrigger npm publish (previous version did not reach npm)

## [0.1.5] - 2026-04-12

### Changed

- No-op patch bump to verify bulk distribution pipeline

## [0.1.4] - 2026-04-12

### Changed

- No-op patch bump to test bulk distribution pipeline

## [0.1.3] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

## [0.1.2] - 2026-03-10

### Fixed

- Pinned `fast-xml-parser` to `>=5.3.4 <5.5.0` to work around broken `file:` dependency in `fast-xml-parser@5.5.0` that causes `ERR_MODULE_NOT_FOUND` when installing via npx

## [0.1.1] - 2026-02-28

### Changed

- **BREAKING**: Separated `delete` operations into their own tool group. `delete_object` and `delete_bucket` are no longer part of the `readwrite` group. To enable delete operations, include `delete` in `GCS_ENABLED_TOOLGROUPS` (e.g., `GCS_ENABLED_TOOLGROUPS="readonly,readwrite,delete"`). All groups are still enabled by default when `GCS_ENABLED_TOOLGROUPS` is not set.

### Fixed

- Fixed prepare-publish.js to exit with non-zero code on uncaught errors
- Removed unused backward-compatibility registerTools function

## [0.1.0] - 2026-02-10

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
