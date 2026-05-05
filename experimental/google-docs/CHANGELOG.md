# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
