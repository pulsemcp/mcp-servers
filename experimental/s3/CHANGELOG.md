# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-02-05

### Added

- Initial S3 MCP server implementation
- S3 bucket operations:
  - `s3_list_buckets` - List all buckets in the account
  - `s3_create_bucket` - Create a new bucket
  - `s3_delete_bucket` - Delete an empty bucket
  - `s3_head_bucket` - Check if a bucket exists
- S3 object operations:
  - `s3_list_objects` - List objects with prefix and pagination
  - `s3_get_object` - Get object content as text
  - `s3_put_object` - Upload or update an object
  - `s3_delete_object` - Delete an object
  - `s3_copy_object` - Copy object within or across buckets
- Tool group system for access control:
  - `readonly` group: list, get, head operations
  - `readwrite` group: put, delete, copy, create operations
  - Configure via `S3_ENABLED_TOOLGROUPS` environment variable
- Individual tool enable/disable:
  - `S3_ENABLED_TOOLS` - Whitelist specific tools
  - `S3_DISABLED_TOOLS` - Blacklist specific tools
- AWS credential validation on startup
- Support for S3-compatible endpoints (MinIO, LocalStack) via `AWS_ENDPOINT_URL`
- Configuration resource at `s3://config` for debugging
