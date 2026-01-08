# CLAUDE.md - File Upload MCP Server

## Overview

This is an MCP server for uploading files to cloud storage providers. It currently supports Google Cloud Storage (GCS) with plans to add S3, Cloudflare R2, and other providers.

## Architecture

The server follows the standard workspace structure:

```
file-upload/
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

1. **Stateless Operation**: The server doesn't maintain any state. Each upload is independent.

2. **Dual Input Modes**: Accepts either:
   - `file://` URIs for local files (works with MCP resources)
   - Base64-encoded data for direct uploads

3. **No Resource Storage**: Unlike pulse-fetch, this server doesn't store uploaded files as MCP resources. It's a pure upload service.

4. **Public by Default**: Files are made public by default for easy URL sharing. Set `GCS_MAKE_PUBLIC=false` for signed URLs.

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
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key
- `GCS_BASE_PATH`: Prefix for all uploads
- `GCS_MAKE_PUBLIC`: Whether to make files public (default: true)
