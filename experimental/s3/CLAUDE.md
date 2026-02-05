# CLAUDE.md

This file provides guidance to Claude Code when working with the S3 MCP server.

## Overview

This is an MCP server for AWS S3 operations. It provides tools for managing S3 buckets and objects with fine-grained access control through tool groups and individual tool enable/disable settings.

## Architecture

### Tool Groups

The server uses a two-tier access control system:

1. **Tool Groups** (`S3_ENABLED_TOOLGROUPS`):
   - `readonly`: List, get, and head operations
   - `readwrite`: Put, delete, copy, and create operations

2. **Individual Tool Control**:
   - `S3_ENABLED_TOOLS`: Whitelist specific tools
   - `S3_DISABLED_TOOLS`: Blacklist specific tools

### S3 Client

The S3 client (`shared/src/s3-client/`) wraps the AWS SDK v3:

- `s3-client.ts`: Production client using `@aws-sdk/client-s3`
- `s3-client.integration-mock.ts`: Mock client for integration testing

## Available Tools

| Tool               | Group     | Operation                    |
| ------------------ | --------- | ---------------------------- |
| `s3_list_buckets`  | readonly  | List all buckets             |
| `s3_list_objects`  | readonly  | List objects with pagination |
| `s3_get_object`    | readonly  | Get object content           |
| `s3_head_bucket`   | readonly  | Check bucket existence       |
| `s3_put_object`    | readwrite | Upload/update objects        |
| `s3_delete_object` | readwrite | Delete objects               |
| `s3_copy_object`   | readwrite | Copy objects                 |
| `s3_create_bucket` | readwrite | Create buckets               |
| `s3_delete_bucket` | readwrite | Delete buckets               |

## Development

### Key Files

- `local/src/index.ts`: Entry point with environment validation
- `shared/src/server.ts`: Server factory
- `shared/src/tools.ts`: Tool registration and grouping
- `shared/src/tools/*.ts`: Individual tool implementations
- `shared/src/s3-client/`: AWS S3 client wrapper

### Testing

```bash
npm run test:run         # Functional tests
npm run test:integration # Integration tests
npm run test:manual      # Manual tests (requires AWS creds)
```

### Environment Variables

Required:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Optional:

- `AWS_REGION` (default: us-east-1)
- `AWS_ENDPOINT_URL` (for S3-compatible services)
- `S3_ENABLED_TOOLGROUPS`
- `S3_ENABLED_TOOLS`
- `S3_DISABLED_TOOLS`
- `SKIP_HEALTH_CHECKS`

## Changelog

Always update `CHANGELOG.md` when making changes.
