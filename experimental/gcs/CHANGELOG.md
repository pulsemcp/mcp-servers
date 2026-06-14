# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.14] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.1.13] - 2026-06-13

### Documentation

- README: add a **Required IAM permissions** section documenting the minimal permission per mode — `storage.objects.list` on the constrained bucket for single-bucket deployments, project-level `storage.buckets.list` for unconstrained — plus a per-tool runtime permission table (including the `put_object_from_path` and `upload_prefix` upload tools). Rewrote the Single Bucket Mode closing note, which previously promised access "without giving broader GCS permissions" without explaining how; it now states the least-privilege guarantee precisely and cross-references the new section.

### Changed

- Reconciled the `server.json` MCP Registry manifest version (both the top-level and the npm package field) with `local/package.json` at `0.1.13`. The manifest had drifted behind `local/package.json` because version bumps update the package file but not the registry manifest; this release realigns them.
- Added a dedicated GitHub Actions workflow (`.github/workflows/mcp-servers-gcs.yml`) that runs the GCS lint/type-check and functional + integration tests on pull requests and pushes to `main`, matching the per-server CI other servers (zoom, monarch-money, sharepoint) already have. Also added `**/local/shared/` to the eslint `ignorePatterns` so the generated build-output symlink is not linted.

## [0.1.12] - 2026-06-13

### Added

- `put_object_from_path` (readwrite): upload a single local file to GCS by streaming it directly from a filesystem path. Unlike `put_object` (which takes content inline as a string argument — routing every byte through the model context and requiring base64 for binary data), this tool reads from disk server-side, so it is binary-safe and does not consume context. Content type is auto-detected from the file extension. Returns `{ bucket, key, sourcePath, size, etag, generation }`.
- `upload_prefix` (readwrite): recursively upload every file under a local directory to GCS, preserving the directory structure as key paths beneath a destination prefix. Streams each file from disk (binary-safe, context-free), follows symbolic links to files (skips links to directories to avoid cycles), collects per-file errors without aborting the batch, and returns a manifest (`bucket`, `sourceDir`, `destPrefix`, `objectCount`, `totalBytes`, capped `files` list, `errors`). This is the bulk counterpart to `download_prefix` for the upload direction.
- `uploadFile` on the GCS client interface, which streams a local file directly to GCS via the SDK's `bucket.upload` (auto-detecting content type) instead of buffering content through the caller.

## [0.1.11] - 2026-06-12

### Fixed

- Startup healthcheck for a `GCS_BUCKET`-constrained server now validates credentials with an object-scoped list (`storage.objects.list`) instead of a bucket-metadata probe. The previous (`0.1.10`) constrained path used `headBucket`, which calls `storage.buckets.get` — but a correctly least-privilege, single-bucket **read-only** service account can be denied `storage.buckets.get` just as it is denied `storage.buckets.list`, so it still failed startup validation and (via `should_fail_session`) took down the whole session. Verified first-hand against the real `gcs-agent-transcripts` read SA: `storage.objects.list` on the pinned bucket → 200, while both `storage.buckets.list` and `storage.buckets.get` → 403. The constrained path now probes `listObjects(bucket, { maxResults: 1 })`, which is the exact permission the server actually exercises; the unconstrained (multi-bucket) path still uses `listBuckets()`, which legitimately needs project-level access.

## [0.1.10] - 2026-06-12

### Fixed

- Startup healthcheck no longer requires the project-level `storage.buckets.list` permission when a `GCS_BUCKET` constraint is active. Previously `performHealthChecks()` unconditionally called `listBuckets()` to validate credentials, which fails for least-privilege, bucket-scoped service accounts that are correctly limited to a single bucket. The constrained path now validates credentials by probing only the constrained bucket via `headBucket` (which needs only bucket-level `storage.buckets.get`); `listBuckets()` is still used in the unconstrained case, which legitimately needs project-level access. Credential validation is extracted into a testable `validateGcsCredentials` helper with functional test coverage.

## [0.1.9] - 2026-06-12

### Added

- `download_prefix` (readonly): recursively download every object under a prefix to a local directory, preserving the key path structure as subdirectories. Paginates through the full listing, writes raw bytes (binary-safe), skips directory-placeholder objects, collects per-object errors without aborting the batch, and returns a manifest (`destinationDir`, `objectCount`, `totalBytes`, capped `files` list, `errors`). Defaults the destination to a unique folder under the OS temp directory. This fills the gap left by `get_object`, which only returns a single object inline as UTF-8 text.
- `download_object` (readonly): download a single object to a local file path, writing raw bytes (binary-safe) instead of lossy inline UTF-8 text.
- `getObjectBytes` on the GCS client interface, returning raw object `Buffer` bytes for binary-safe local writes.

## [0.1.8] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.1.7] - 2026-04-25

### Changed

- No-op patch bump to retrigger npm publish. The 0.1.6 publish was blocked because the prior bulk sync's GCS functional-tests job in the public-repo CI hung at `npm ci` for 6 hours (transient self-hosted runner issue, traced to orphan `npm ci` process at job termination), which caused the publish workflow to time out for all four bundled servers (dynamodb, fly-io, gcs, onepassword). Bumping gcs on its own to trigger an isolated sync.

## [0.1.6] - 2026-04-24

### Changed

- No-op patch bump to retrigger npm publish (previous version did not reach npm)

## [0.1.5] - 2026-04-12

### Changed

- No-op patch bump to verify bulk distribution pipeline

## [0.1.4] - 2026-04-12

### Changed

- No-op patch bump to test bulk distribution pipeline

## [0.1.3] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

## [0.1.2] - 2026-03-10

### Fixed

- Pinned `fast-xml-parser` to `>=5.3.4 <5.5.0` to work around broken `file:` dependency in `fast-xml-parser@5.5.0` that causes `ERR_MODULE_NOT_FOUND` when installing via npx

## [0.1.1] - 2026-02-28

### Changed

- **BREAKING**: Separated `delete` operations into their own tool group. `delete_object` and `delete_bucket` are no longer part of the `readwrite` group. To enable delete operations, include `delete` in `GCS_ENABLED_TOOLGROUPS` (e.g., `GCS_ENABLED_TOOLGROUPS="readonly,readwrite,delete"`). All groups are still enabled by default when `GCS_ENABLED_TOOLGROUPS` is not set.

### Fixed

- Fixed prepare-publish.js to exit with non-zero code on uncaught errors
- Removed unused backward-compatibility registerTools function

## [0.1.0] - 2026-02-10

### Added

- Initial GCS MCP server implementation with feature parity to S3 MCP server
- Full bucket management: list, create, delete, head (existence check)
- Full object management: list, get, put, delete, copy
- Fine-grained access control with tool groups (readonly, readwrite)
- Individual tool enable/disable via GCS_ENABLED_TOOLS and GCS_DISABLED_TOOLS
- Single bucket constraint mode via GCS_BUCKET environment variable
- Multiple authentication methods: service account key file, inline JSON, Application Default Credentials
- Health checks at startup to validate credentials and bucket access
- Config resource at gcs://config for debugging server state
- Functional tests for all tools and tool filtering logic
- Integration tests with TestMCPClient and mock GCS client
- Manual tests for all operations against real GCS API
- CI workflow for automated testing
