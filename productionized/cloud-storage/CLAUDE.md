# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the cloud-storage MCP server.

## Overview

This MCP server provides cloud storage operations for Google Cloud Storage (GCS), with a design that supports future extension to other cloud storage providers like AWS S3.

## Architecture

### Storage Client Pattern

The server uses an interface-based storage client pattern:

- `IStorageClient` - Interface defining all storage operations
- `GCSStorageClient` - Google Cloud Storage implementation
- `MockStorageClient` - In-memory mock for testing
- Future: `S3StorageClient` for AWS S3

### Directory Structure

```
cloud-storage/
├── local/                      # Local server entry point
│   ├── src/
│   │   ├── index.ts           # Main entry with env validation
│   │   └── index.integration-with-mock.ts  # Test entry point
│   └── package.json
├── shared/                     # Shared business logic
│   ├── src/
│   │   ├── server.ts          # Server factory
│   │   ├── tools.ts           # Tool registration
│   │   ├── tools/             # Individual tools
│   │   │   ├── save-file.ts
│   │   │   ├── get-file.ts
│   │   │   ├── search-files.ts
│   │   │   └── delete-file.ts
│   │   ├── resources.ts       # MCP resources (file listing)
│   │   ├── storage-client/    # Storage abstraction
│   │   │   ├── types.ts       # Interfaces
│   │   │   ├── gcs-client.ts  # GCS implementation
│   │   │   └── mock-client.ts # Mock for testing
│   │   └── logging.ts         # Centralized logging
│   └── package.json
├── tests/                      # Test suite
│   ├── functional/
│   ├── integration/
│   ├── manual/
│   └── mocks/
└── package.json               # Root workspace config
```

## Key Design Decisions

### Context Window Preservation

Tools support both inline content and local file references:

- `save_file`: Accept `content` (inline) or `local_file_path` (file reference)
- `get_file`: Return content inline or save to `local_file_path`

This allows LLMs to work with large/binary files without consuming context window.

### MCP Resources

Files in the bucket are exposed as MCP resources:

- `cloud-storage://config` - Server configuration
- `cloud-storage://file/{path}` - Individual files

This enables MCP clients to browse available files.

### Tool Groups

Tools are organized into permission groups:

- `readonly`: get_file, search_files
- `write`: readonly + save_file
- `admin`: write + delete_file

## Adding New Storage Providers

To add a new provider (e.g., S3):

1. Create `shared/src/storage-client/s3-client.ts`
2. Implement `IStorageClient` interface
3. Add configuration type (e.g., `S3Config`)
4. Update `server.ts` to support the new provider
5. Add environment variable handling

## Environment Variables

| Variable             | Required | Description                    |
| -------------------- | -------- | ------------------------------ |
| `GCS_BUCKET`         | Yes      | GCS bucket name                |
| `GCS_ROOT_DIRECTORY` | No       | Root prefix within bucket      |
| `GCS_PROJECT_ID`     | No       | GCP project ID                 |
| `GCS_KEY_FILE`       | No       | Path to service account key    |
| `ENABLED_TOOLGROUPS` | No       | Tool groups to enable          |
| `SKIP_HEALTH_CHECKS` | No       | Skip bucket connectivity check |

## Testing

### Functional Tests

Test individual components with mocked storage:

```typescript
import { MockStorageClient } from '../shared/src/storage-client/mock-client.js';

const client = new MockStorageClient({
  files: {
    'test.txt': { content: 'Hello', contentType: 'text/plain' },
  },
});
```

### Integration Tests

Use `TestMCPClient` with the mock entry point:

```typescript
const client = new TestMCPClient({
  serverPath: 'local/build/index.integration-with-mock.js',
  env: {
    STORAGE_MOCK_DATA: JSON.stringify({ files: {...} }),
  },
});
```

### Manual Tests

Require real GCS credentials in `.env`:

```bash
GCS_BUCKET=my-test-bucket
GCS_KEY_FILE=/path/to/key.json
```

## Logging

Use the centralized logging module - never use `console.log` directly:

- `logServerStart(serverName)` - Log server startup
- `logError(context, error)` - Log errors
- `logWarning(context, message)` - Log warnings
- `logDebug(context, message)` - Debug info (dev only)

## Changelog Updates

Always update `CHANGELOG.md` when making changes to track version history.
