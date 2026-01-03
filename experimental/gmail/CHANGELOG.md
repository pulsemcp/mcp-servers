# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
