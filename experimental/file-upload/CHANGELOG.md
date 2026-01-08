# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Major refactor to remote-filesystem MCP server**
- New `upload` tool - upload files with configurable path, content type, and public/private access
- New `download` tool - download files as text or base64 (for binary files)
- New `list_files` tool - list files and directories with prefix filtering
- New `modify` tool - change file properties (public/private, content type, metadata)
- New `delete_file` tool - delete files from remote storage
- Inline credentials support via `GCS_CLIENT_EMAIL` and `GCS_PRIVATE_KEY` env vars
- Root path constraint via `GCS_ROOT_PATH` to restrict access within bucket
- Toolset groups (`readonly` vs `readwrite`) via `ENABLED_TOOLGROUPS` env var
- Signed URL generation for private files (7-day expiry)

### Changed

- Server renamed from `file-upload-mcp-server` to `remote-filesystem-mcp-server`
- Replaced single `upload_to_gcs` tool with comprehensive filesystem tools
- `GCS_ROOT_PATH` replaces `GCS_BASE_PATH` for consistent naming
- Path traversal protection prevents access outside root directory

### Deprecated

- `upload_to_gcs` tool removed in favor of new `upload` tool

## [0.1.0] - 2026-01-08

### Added

- Initial release of file-upload MCP server
- `upload_to_gcs` tool for uploading files to Google Cloud Storage
- Support for `file://` URIs and base64-encoded data
- Automatic content type detection from filename
- Public URL generation with optional signed URLs for private buckets
- Configurable base path prefix for organized storage
- Server configuration resource for debugging
