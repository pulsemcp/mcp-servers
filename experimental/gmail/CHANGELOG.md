# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

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
