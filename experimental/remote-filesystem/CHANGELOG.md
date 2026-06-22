# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] - 2026-06-22

### Fixed

- Disabled HTTP keep-alive on outbound GCS connections to stop a deterministic `ERR_STREAM_PREMATURE_CLOSE` ("Invalid response body while trying to fetch https://www.googleapis.com/oauth2/v4/token: Premature close") that took down every read and write. Node 19+ defaults the global agent to `keepAlive: true`; the GCS SDK's OAuth token exchange runs through `google-auth-library` → `gtoken` → `gaxios` → `node-fetch` 2.x, which reuses those pooled sockets. When an egress middlebox resets a keep-alive connection, node-fetch surfaces a no-response premature close that is identical on every attempt, so the v0.1.4 retry budget could not self-heal it (each retry rode the same poisoned socket path). `gtoken` builds its own `gaxios` instance with no per-client agent hook, so the fix forces a fresh socket per request via the process-global agent (this server's only outbound traffic is to GCS). The v0.1.4 retry-with-backoff is retained for genuinely transient blips.

## [0.1.4] - 2026-06-22

### Fixed

- Added application-level retry-with-backoff around all GCS operations so a transient connection-level failure on the OAuth token exchange (e.g. `Invalid response body while trying to fetch https://www.googleapis.com/oauth2/v4/token: Premature close`) no longer takes the whole server down on the first request. Connection-reset/DNS-blip signatures (`Premature close`, `ECONNRESET`, `socket hang up`, `EAI_AGAIN`, etc.) are now retried with exponential backoff at both the application layer and the GCS SDK layer (via a broadened `retryableErrorFn`), giving the connection time to self-heal. Permanent failures (e.g. `invalid_grant`, `File not found`, 403) are still surfaced immediately without retry.

## [0.1.3] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.1.2] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.1.1] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

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
