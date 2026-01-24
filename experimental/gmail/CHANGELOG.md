# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
