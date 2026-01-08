# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-08

### Added

- Initial release of file-upload MCP server
- `upload_to_gcs` tool for uploading files to Google Cloud Storage
- Support for `file://` URIs and base64-encoded data
- Automatic content type detection from filename
- Public URL generation with optional signed URLs for private buckets
- Configurable base path prefix for organized storage
- Server configuration resource for debugging
