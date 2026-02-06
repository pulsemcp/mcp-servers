# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.2] - 2026-02-06

### Added

- `S3_FORCE_PATH_STYLE` environment variable to enable path-style addressing for S3-compatible services like MinIO that require it (instead of virtual-hosted-style addressing)

## [0.0.1] - 2026-02-06

### Added

- Initial S3 MCP server implementation
- S3 bucket operations:
  - `list_buckets` - List all buckets in the account
  - `create_bucket` - Create a new bucket
  - `delete_bucket` - Delete an empty bucket
  - `head_bucket` - Check if a bucket exists
- S3 object operations:
  - `list_objects` - List objects with prefix and pagination
  - `get_object` - Get object content as text
  - `put_object` - Upload or update an object
  - `delete_object` - Delete an object
  - `copy_object` - Copy object within or across buckets
- Tool group system for access control:
  - `readonly` group: list, get, head operations
  - `readwrite` group: put, delete, copy, create operations
  - Configure via `S3_ENABLED_TOOLGROUPS` environment variable
- Individual tool enable/disable:
  - `S3_ENABLED_TOOLS` - Whitelist specific tools
  - `S3_DISABLED_TOOLS` - Blacklist specific tools
- Single bucket mode via `S3_BUCKET` environment variable:
  - Constrains all operations to a specific bucket
  - Hides bucket-level tools when set
  - Automatically injects bucket parameter for object operations
- AWS credential validation on startup
- Support for S3-compatible endpoints (MinIO, LocalStack) via `AWS_ENDPOINT_URL`
- Configuration resource at `s3://config` for debugging
