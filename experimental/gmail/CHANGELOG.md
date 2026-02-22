# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.1.2] - 2026-02-22

### Added

- `oauth-setup` CLI subcommand so personal Gmail users can obtain a refresh token directly via `npx gmail-workspace-mcp-server oauth-setup <client_id> <client_secret>` without cloning the repository or installing extra dependencies
  - Addresses [issue #349](https://github.com/pulsemcp/mcp-servers/issues/349)

### Fixed

- OAuth setup no longer requires cloning the repo — the flow is now bundled in the published npm package as a built-in subcommand
- Error messages now reference the working `npx gmail-workspace-mcp-server oauth-setup` command instead of the unavailable `npx tsx scripts/oauth-setup.ts`

## [0.1.1] - 2026-02-09

### Added

- `download_email_attachments` tool for downloading attachment content from emails
  - By default, saves attachments to `/tmp/` and returns full file paths — ideal for binary files or subsequent processing
  - Optional `inline` parameter returns content directly in the response (text decoded, binary as base64)
  - Downloads all attachments in a single call by default, or a specific one via the `filename` parameter
  - 25 MB size limit applies only in inline mode to prevent context window overflow
  - Detects attachments at both payload level (single-part emails) and nested MIME parts
  - Filenames sanitized to prevent path traversal; duplicates auto-deduplicated
  - Available in all tool groups (readonly, readwrite, readwrite_external) since downloading doesn't modify mailbox state
  - E2E manual tests verify file integrity byte-for-byte against direct API download
  - Addresses [issue #302](https://github.com/pulsemcp/mcp-servers/issues/302)

## [0.1.0] - 2026-01-25

### Added

- OAuth2 user authentication for personal Gmail accounts (`@gmail.com` and other non-Workspace accounts)
  - New `OAuth2GmailClient` class using OAuth2 refresh tokens instead of service account JWT
  - Automatic user email detection via Gmail profile API (no additional configuration needed)
  - One-time setup script (`scripts/oauth-setup.ts`) to obtain refresh tokens via browser-based consent flow
  - Setup script supports both CLI arguments and environment variables for credentials
  - Token caching with automatic refresh, matching the existing service account pattern
- `createDefaultClient()` now auto-detects auth mode based on environment variables:
  - `GMAIL_OAUTH_CLIENT_ID` + `GMAIL_OAUTH_CLIENT_SECRET` + `GMAIL_OAUTH_REFRESH_TOKEN` → OAuth2 mode
  - `GMAIL_SERVICE_ACCOUNT_*` → Service Account mode (existing behavior, unchanged)
  - Warns on partial OAuth2 configuration before falling back to service account mode
- Environment validation now provides targeted guidance for both auth modes with partial-config detection for OAuth2 and service account credentials
- Shared `GMAIL_SCOPES` constant ensures scope consistency across auth implementations
- Extracted `BaseGmailClient` abstract class to share token management and API logic between auth modes
- Addresses [issue #279](https://github.com/pulsemcp/mcp-servers/issues/279)

## [0.0.5] - 2026-01-24

### Added

- `include_html` parameter to `get_email_conversation` for returning raw HTML email content
  - When `true`, includes the original HTML body in addition to plain text
  - Useful for rendering emails with original formatting, creating screenshots, or archival workflows
  - Addresses [issue #276](https://github.com/pulsemcp/mcp-servers/issues/276)
- `after` and `before` datetime parameters to `list_email_conversations` for filtering emails by time range
  - ISO 8601 format in UTC (e.g., `2024-01-15T14:30:00Z`)
  - Both parameters are exclusive (emails strictly after/before the specified datetime)

### Fixed

- Labels in `change_email_conversation` are now case-sensitive to properly support user-defined label IDs
- Extracted duplicate `formatEmail` function to shared utility

## [0.0.4] - 2026-01-23

### Added

- **New Tools**:
  - `search_email_conversations` - Search emails using Gmail query syntax (from:, subject:, is:unread, etc.)
  - `change_email_conversation` - Modify email status (read/unread/archived) and labels (starred, custom labels)
  - `draft_email` - Create email drafts with optional in-conversation (reply) support
  - `send_email` - Send emails directly or from existing drafts, with reply support
- **Tool Groups**: Added permission-based tool access control via `GMAIL_ENABLED_TOOLGROUPS` environment variable
  - `readonly`: list, get, and search email conversations (low risk)
  - `readwrite`: all readonly tools plus modify labels and create drafts (medium risk)
  - `readwrite_external`: all readwrite tools plus send_email (high risk - external communication)

### Changed

- **BREAKING**: Renamed tools for better clarity:
  - `gmail_list_recent_emails` → `list_email_conversations`
  - `gmail_get_email` → `get_email_conversation`
- **BREAKING**: `list_email_conversations` parameters changed:
  - Removed `hours` parameter
  - Added `count` parameter (default: 10, max: 100)
  - Added `labels` parameter for filtering by Gmail labels
  - Added `sort_by` parameter (accepts: 'recent', 'oldest')
- Extended Gmail API scopes to include `gmail.modify`, `gmail.compose`, and `gmail.send` for write operations
- Added `IGmailClient` interface methods: `modifyMessage`, `createDraft`, `getDraft`, `listDrafts`, `deleteDraft`, `sendMessage`, `sendDraft`

## [0.0.3] - 2026-01-03

### Fixed

- Restored missing `scripts/prepare-npm-readme.js` file that was accidentally deleted, which caused npm publish to fail

## [0.0.2] - 2026-01-03

### Changed

- **BREAKING**: Changed authentication from file-based to environment variable-based
  - Replaced `GMAIL_SERVICE_ACCOUNT_KEY_FILE` with `GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL` and `GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY`
  - Credentials are now passed directly as environment variables instead of a file path
  - This allows more flexible deployment (e.g., in containerized environments where mounting files is not ideal)

## [0.0.1] - Initial Release

### Added

- Initial implementation of Gmail Workspace MCP server
- `gmail_list_recent_emails` tool for listing recent emails
  - Configurable time horizon (hours parameter)
  - Label filtering support
  - Configurable result limit
- `gmail_get_email` tool for retrieving full email content
  - Decodes base64url encoded email bodies
  - Extracts plain text from multipart emails
  - Lists attachments with size information
- Service account authentication with domain-wide delegation
- Credential validation for service account key files
- Token refresh mutex to prevent concurrent refresh race conditions
- Structured error handling for Gmail API errors (401, 403, 429, 404)
- Functional, integration, and manual test suites
