# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial implementation of cloud-storage MCP server
- Google Cloud Storage (GCS) support via `GCSStorageClient`
- `save_file` tool for uploading files
  - Support for inline content or local file path
  - Custom content type detection
  - Custom metadata support
- `get_file` tool for downloading files
  - Support for inline content return or save to local path
  - Preserves context window for binary/large files
- `search_files` tool for listing files
  - Prefix filtering for "folder" navigation
  - Pagination with `limit` and `page_token`
- `delete_file` tool for removing files
- MCP Resources exposing bucket files
  - `cloud-storage://config` for server configuration
  - `cloud-storage://file/{path}` for individual files
- Tool grouping system for permission control
  - `readonly` group: get_file, search_files
  - `write` group: readonly + save_file
  - `admin` group: write + delete_file
- Environment variable validation at startup
- Health check for GCS bucket connectivity
- Mock storage client for testing
- Comprehensive documentation (README, CLAUDE.md)

### Future Work

- AWS S3 support (planned)
- Azure Blob Storage support (potential)
- File versioning support
- Signed URL generation
