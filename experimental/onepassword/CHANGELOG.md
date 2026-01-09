# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2026-01-09

### Security

- **BREAKING**: Remove item IDs from all tool responses to prevent constructing unlock URLs without explicit user action through the 1Password app (fixes #221)
- **BREAKING**: Filter `additional_information` field from list responses to prevent Secure Note content leakage
- **BREAKING**: Remove vault IDs from list item responses (vault IDs are still returned by `onepassword_list_vaults` as they're required for API operations)
- **BREAKING**: Remove field IDs from item detail responses; only field labels are now returned
- Item lookups via `onepassword_get_item` now work with titles instead of IDs
- The unlock mechanism via 1Password URLs remains the exclusive credential exposure pathway
- The `onepassword_unlock_item` response no longer echoes item IDs or vault IDs

## [0.1.0]

### Added

- Initial 1Password MCP server implementation
- 1Password CLI wrapper with service account authentication
- `onepassword_list_vaults` tool - List all accessible vaults
- `onepassword_list_items` tool - List items in a vault
- `onepassword_get_item` tool - Get item details (credentials redacted unless unlocked)
- `onepassword_list_items_by_tag` tool - Find items by tag
- `onepassword_unlock_item` tool - Unlock items via 1Password URL for credential access
- `onepassword_create_login` tool - Create login credentials with URL validation
- `onepassword_create_secure_note` tool - Create secure notes
- URL parser for extracting item IDs from 1Password share URLs
- Credential redaction by default - items must be unlocked via URL before credentials are exposed
- Configuration resource at `onepassword://config`
- Tool grouping system with `readonly` and `write` groups
- Health check to validate credentials on startup
- Comprehensive error handling for CLI failures
- Functional and integration test suites (26 tests)
