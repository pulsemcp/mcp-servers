# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial 1Password MCP server implementation
- 1Password CLI wrapper with service account authentication
- `onepassword_list_vaults` tool - List all accessible vaults
- `onepassword_list_items` tool - List items in a vault
- `onepassword_get_item` tool - Get full item details including credentials
- `onepassword_list_items_by_tag` tool - Find items by tag
- `onepassword_create_login` tool - Create login credentials
- `onepassword_create_secure_note` tool - Create secure notes
- Configuration resource at `onepassword://config`
- Tool grouping system with `readonly` and `write` groups
- Health check to validate credentials on startup
- Comprehensive error handling for CLI failures
- Functional and integration test suites
