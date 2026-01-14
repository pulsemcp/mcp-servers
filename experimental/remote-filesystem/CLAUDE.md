# CLAUDE.md - Remote Filesystem MCP Server

## Overview

This is an MCP server for remote filesystem operations on cloud storage providers. It currently supports Google Cloud Storage (GCS) with plans to add S3, Cloudflare R2, and other providers.

## Architecture

The server follows the standard workspace structure:

```
remote-filesystem/
├── shared/           # Core logic (publishable)
│   └── src/
│       ├── gcs-client/   # GCS client implementation
│       ├── tools/        # MCP tool implementations
│       ├── server.ts     # Server factory
│       └── types.ts      # TypeScript interfaces
├── local/            # CLI entry point (npm package)
│   └── src/
│       └── index.ts      # Main entry point
└── tests/            # Test suites
```

## Key Design Decisions

1. **Stateless Operation**: The server doesn't maintain any state. Each operation is independent.

2. **Dual Input Modes**: Accepts either:
   - `file://` URIs for local files (works with MCP resources)
   - Base64-encoded data for direct uploads

3. **Full CRUD Operations**: Supports upload, download, list, modify, and delete operations.

4. **Private by Default**: Files are private by default for security. Set `GCS_MAKE_PUBLIC=true` for public access.

5. **Root Path Constraint**: `GCS_ROOT_PATH` restricts all operations to a specific directory within the bucket.

## Testing

```bash
# Functional tests (with mocks)
npm test

# Integration tests (requires build)
npm run test:integration

# Manual tests (requires real GCS credentials)
npm run test:manual
```

## Environment Variables

- `GCS_BUCKET` (required): Target bucket name
- `GCS_PROJECT_ID`: Google Cloud project
- `GCS_CLIENT_EMAIL`: Service account email (inline credentials)
- `GCS_PRIVATE_KEY`: Service account private key (inline credentials)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key file
- `GCS_ROOT_PATH`: Root path prefix - restricts access within bucket
- `GCS_MAKE_PUBLIC`: Whether to make files public (default: false)
- `ENABLED_TOOLGROUPS`: Comma-separated list: `readonly`, `readwrite` (default: all)
