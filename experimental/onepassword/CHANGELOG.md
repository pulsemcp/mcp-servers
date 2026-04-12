# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

## [0.3.0] - 2026-03-20

### Changed

- **BREAKING**: Server now refuses to start unless elicitation is configured or explicitly opted out. Previously, the server would silently allow carte blanche access to all 1Password secrets when elicitation was not configured.
- **BREAKING**: Remove `ELICITATION_ENABLED` — use `DANGEROUSLY_SKIP_ELICITATIONS=true` to bypass all confirmation prompts. The explicit, intentionally-named variable makes it clear that skipping elicitation is a dangerous operation.

### Added

- `DANGEROUSLY_SKIP_ELICITATIONS` environment variable — must be explicitly set to `"true"` to disable all elicitation prompts
- Startup safety validation that checks for a configured elicitation mechanism (HTTP fallback URLs) or explicit opt-out before allowing the server to start
- `checkElicitationSafety()` helper for testable startup safety logic
- Whitespace-only URL trimming in HTTP fallback URL detection

## [0.2.3] - 2026-03-19

### Fixed

- Fix `@pulsemcp/mcp-elicitation` not being bundled in the published npm package, causing `ERR_MODULE_NOT_FOUND` when running via `npx`. The `prepare-publish.js` script now copies the built elicitation library into `local/node_modules/` so `bundledDependencies` can include it in the tarball

## [0.2.2] - 2026-03-19

### Fixed

- Fix npm publish failure by building `@pulsemcp/mcp-elicitation` dependency before shared module in `prepare-publish.js`
- Use `--ignore-scripts` when installing elicitation deps to avoid monorepo husky hook failure in CI

## [0.2.0] - 2026-03-18

### Changed

- **BREAKING**: Replace `onepassword_unlock_item` tool and manual URL-based unlock flow with MCP elicitation-based approval
  - Credential access in `onepassword_get_item` now prompts for user confirmation via elicitation instead of requiring a 1Password URL
  - Write operations (`onepassword_create_login`, `onepassword_create_secure_note`) now prompt for confirmation before creating items
  - Remove `onepassword_unlock_item` tool and in-memory unlock state (`unlocked-items.ts`)

### Added

- Elicitation-based approval for both read and write operations using `@pulsemcp/mcp-elicitation`
- Configurable elicitation via environment variables:
  - `ELICITATION_ENABLED` - Master toggle (default: `true`)
  - `OP_ELICITATION_READ` - Per-action override for credential access (default: follows master)
  - `OP_ELICITATION_WRITE` - Per-action override for write operations (default: follows master)
  - `OP_WHITELISTED_ITEMS` - Comma-separated item titles or IDs that bypass read elicitation
- Item whitelisting to bypass elicitation for pre-approved items by title or item ID (e.g., `OP_WHITELISTED_ITEMS=Stripe Key,abc123def456`)
- Elicitation config shown in `onepassword://config` resource
- 10 new tests covering elicitation config parsing, whitelisting, and credential redaction behavior (39 total)

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
