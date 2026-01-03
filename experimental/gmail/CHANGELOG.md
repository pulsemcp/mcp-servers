# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Service account authentication with domain-wide delegation support
- Structured error handling for Gmail API errors (401, 403, 429, 404)
- Additional test coverage for edge cases (no subject, HTML-only body, attachments, empty body)
- Manual test suite with service account and access token authentication options

## [0.0.1] - Initial Release

### Added

- Initial implementation of Gmail MCP server
- `gmail_list_recent_emails` tool for listing recent emails
  - Configurable time horizon (hours parameter)
  - Label filtering support
  - Configurable result limit
- `gmail_get_email` tool for retrieving full email content
  - Decodes base64url encoded email bodies
  - Extracts plain text from multipart emails
  - Lists attachments with size information
- OAuth2 access token authentication
- Functional and integration test suites
