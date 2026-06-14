# Changelog

All notable changes to this project will be documented in this file.

## [0.1.4] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.1.3] - 2026-06-01

### Added

- `list_comments` tool (in the `readonly` tool group): lists a document's comments via the Drive `comments.list` API, including threaded replies, resolved/open state, and the anchored quoted text. Supports `include_resolved` and `include_deleted` parameters.

### Changed

- Replaced the `https://www.googleapis.com/auth/drive.file` OAuth scope with the broader `https://www.googleapis.com/auth/drive` scope (a strict superset). The full `drive` scope lets the server export arbitrary existing docs and read their comments — operations the narrower `drive.file` scope could not perform on files the app did not itself create or open. Fixes the `export_document` 403 (`The user has not granted the app … read access to the file`) seen on docs created outside the app. Note this is a broad grant: read and write across all of the impersonated/authenticated user's Drive files.

> **Operator action required:** for service-account (domain-wide delegation) deployments, `drive` must also be authorized in the Google Workspace Admin domain-wide-delegation panel; for OAuth2 deployments, re-run `oauth-setup` to reconsent. Until the scope is granted, the new read capabilities will not take effect at runtime.

## [0.1.2] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.1.1] - 2026-05-05

### Fixed

- Added missing `scripts/prepare-npm-readme.js` referenced by `local/package.json`'s `prepublishOnly` script. Without it, the public `pulsemcp/mcp-servers` repo's "Validate Publish Files" check failed and blocked the sync PR from merging, preventing v0.1.0 from ever being published to npm.

## [0.1.0] - 2026-05-04

### Added

- Initial release of the Google Docs Workspace MCP server
- Read tools: `get_document`, `get_document_outline`, `export_document`
- Write tools: `create_document`, `update_document`, `delete_document`, `append_text`, `insert_text`, `replace_text`
- Sharing tool (gated behind `readwrite_external`): `share_document`
- Two authentication modes: OAuth2 (personal accounts) and service account (Google Workspace with domain-wide delegation)
- `oauth-setup` CLI subcommand for obtaining a refresh token via a one-time consent flow, mirroring the gmail server's pattern
- Tool group gating via `GOOGLE_DOCS_ENABLED_TOOLGROUPS` (`readonly`, `readwrite`, `readwrite_external`); invalid values fail closed with a clear error rather than silently expanding scope
- Document IDs and shareable Docs URLs are interchangeable across all tools, including `?id=` query-form URLs (e.g., `https://drive.google.com/open?id=...`)
- `share_document` automatically defaults `sendNotificationEmail=false` for `type=anyone` and `type=domain`, since Google rejects `true` for those grantee types
- Google API errors are categorized (auth / forbidden / not_found / rate_limit / server / client) so callers can react programmatically
- E2E test suite (`tests/e2e/`) that exercises the live Google Docs and Drive APIs via the MCP server, with a pinned read-only test document and a self-cleaning lifecycle test (create → mutate → export → share → delete). Credentials are stored encrypted at `tests/e2e/.env.enc` and loaded via the shared `MCP_SERVERS_MASTER_KEY` workflow used by other servers in this directory.
