# CLAUDE.md

This file provides guidance to Claude Code when working with the GCS MCP server.

## Overview

This is an MCP server for Google Cloud Storage operations. It provides tools for managing GCS buckets and objects with fine-grained access control through tool groups and individual tool enable/disable settings.

## Architecture

### Tool Groups

The server uses a two-tier access control system:

1. **Tool Groups** (`GCS_ENABLED_TOOLGROUPS`):
   - `readonly`: List, get, and head operations
   - `readwrite`: Put, delete, copy, and create operations

2. **Individual Tool Control**:
   - `GCS_ENABLED_TOOLS`: Whitelist specific tools
   - `GCS_DISABLED_TOOLS`: Blacklist specific tools

### GCS Client

The GCS client (`shared/src/gcs-client/`) wraps the Google Cloud Storage SDK:

- `gcs-client.ts`: Production client using `@google-cloud/storage`
- `gcs-client.integration-mock.ts`: Mock client for integration testing

## Available Tools

| Tool            | Group     | Operation                    |
| --------------- | --------- | ---------------------------- |
| `list_buckets`  | readonly  | List all buckets             |
| `list_objects`  | readonly  | List objects with pagination |
| `get_object`    | readonly  | Get object content           |
| `head_bucket`   | readonly  | Check bucket existence       |
| `put_object`    | readwrite | Upload/update objects        |
| `delete_object` | readwrite | Delete objects               |
| `copy_object`   | readwrite | Copy objects                 |
| `create_bucket` | readwrite | Create buckets               |
| `delete_bucket` | readwrite | Delete buckets               |

Note: When `GCS_BUCKET` is set, bucket-level tools (`list_buckets`, `create_bucket`, `delete_bucket`, `head_bucket`) are hidden and object-level tools automatically use the constrained bucket.

## Development

### Key Files

- `local/src/index.ts`: Entry point with environment validation
- `shared/src/server.ts`: Server factory
- `shared/src/tools.ts`: Tool registration and grouping
- `shared/src/tools/*.ts`: Individual tool implementations
- `shared/src/gcs-client/`: Google Cloud Storage client wrapper

### Testing

```bash
npm run test:run         # Functional tests
npm run test:integration # Integration tests
npm run test:manual      # Manual tests (requires GCS creds)
```

### Environment Variables

Required:

- `GCS_PROJECT_ID`

Optional:

- `GCS_SERVICE_ACCOUNT_KEY_FILE` (path to service account key JSON file)
- `GCS_SERVICE_ACCOUNT_KEY_JSON` (inline service account key JSON)
- `GCS_BUCKET` (constrain to single bucket)
- `GCS_ENABLED_TOOLGROUPS`
- `GCS_ENABLED_TOOLS`
- `GCS_DISABLED_TOOLS`
- `SKIP_HEALTH_CHECKS`

## Changelog

Always update `CHANGELOG.md` when making changes.
