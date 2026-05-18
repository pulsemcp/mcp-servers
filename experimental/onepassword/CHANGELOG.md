# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.5.3] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.5.2] - 2026-05-10

### Changed

- Strengthen tool descriptions across the server to make batching the unmistakable default. Each tool now leads with an explicit "**BATCH ALL ... INTO ONE CALL**" imperative, calls out concrete anti-patterns (looping, "as you go" creation, splitting batches by vault), and points downstream tools at the right discovery primitive (`onepassword_list_items` / `onepassword_list_items_by_tag` for candidate enumeration; `onepassword_get_item_metadata` for existence/structure checks) instead of a fan-out of `onepassword_get_item` lookups. Motivation: agents were still issuing sequential per-item calls and forcing the user to field a stream of approval elicitations every few seconds. Affected tools: `onepassword_list_vaults`, `onepassword_list_items`, `onepassword_list_items_by_tag`, `onepassword_get_item`, `onepassword_create_login`, `onepassword_create_secure_note`, `onepassword_create_api_credential`, `onepassword_share_item`. No behavior change — descriptions and `items` parameter blurbs only.

## [0.5.1] - 2026-05-07

### Added

- `onepassword_get_item_metadata` — a new read-only tool that returns the same item shape as `onepassword_get_item` (title, category, vault, tags, field labels/types, URLs, dates, plus non-sensitive field values) **without ever triggering an elicitation prompt**. Sensitive field values (CONCEALED, PASSWORD, SECRET, CREDIT*CARD*\*, or labels matching password/secret/token/key/credential/cvv/pin) are stripped entirely — not even a `[REDACTED]` placeholder is returned. Use this when you only need to check whether an item exists or inspect its field structure (e.g., "is there already a 1Password entry for customer X before I mint a new credential?"); reach for `onepassword_get_item` only when you actually need to read a credential value. The motivation: a sister agent recently spent 36 minutes waiting on an elicitation approval just to confirm an item existed — this tool eliminates that friction for the existence-check case.

### Changed

- Tool description for `onepassword_get_item` now points agents at `onepassword_get_item_metadata` for existence and structure checks, so the elicitation prompt is only paid when an actual credential value is needed.

## [0.5.0] - 2026-05-03

### Changed

- **BREAKING**: All elicitation-gated tools now accept a bulk `{ items: [...] }` array instead of a flat single-item object. A single user approval covers the entire batch, eliminating per-credential elicitation friction when an agent provisions multiple credentials in one session.
  - Affected tools: `onepassword_create_login`, `onepassword_create_secure_note`, `onepassword_create_api_credential`, `onepassword_share_item`, `onepassword_get_item`.
  - Affected tools (no elicitation, but extended for batch convenience): `onepassword_list_items`, `onepassword_list_items_by_tag`.
  - `onepassword_list_vaults` is unchanged (no inputs).
  - All affected tools now return a `results` array with one entry per input item, surfacing partial failures per-item without aborting the batch. Per-item `status` is `success` | `error`, plus `declined` | `expired` for write tools when the batch confirmation is declined or times out.
  - For `onepassword_get_item`, sensitive-field reveal is gated by a single batch elicitation listing every item; on accept, all items in the batch reveal credentials. Non-sensitive items, whitelisted items, and disabled-elicitation modes always reveal.
  - Tool descriptions now explicitly nudge agents to bundle anticipated work into a single bulk call.

## [0.4.0] - 2026-04-27

### Changed

- **BREAKING**: Default for `OP_ELICITATION_WRITE` is now `false` (was `true`). Write operations (`onepassword_create_login`, `onepassword_create_secure_note`, `onepassword_create_api_credential`, `onepassword_share_item`) no longer prompt for confirmation by default. Rationale: writes only create new items or mint share URLs for existing ones — they cannot overwrite or delete existing data via these tools — so the friction of a confirmation prompt isn't justified for writes the way it is for reads (which expose existing secrets). To restore the prior behavior, set `OP_ELICITATION_WRITE=true`. Read elicitation (`OP_ELICITATION_READ`) still defaults to `true`.

## [0.3.6] - 2026-04-26

### Fixed

- Bundle now ships `@pulsemcp/mcp-elicitation@1.1.0` as intended. The 0.3.5 tarball silently shipped a stale `1.0.1` bundle because the public `pulsemcp/mcp-servers` repo holds its own copy of `libs/elicitation/` that was never synced from the internal monorepo, so the public repo's `prepublishOnly` rebuilt from stale 1.0.1 source. The internal `distribute.sh`/`distribute-bulk.sh` now sync `libs/` to the public repo on every server distribute, and `prepare-publish.js` now wipes `build/` for a clean rebuild and asserts the bundled lib version matches the source — so this kind of drift fails the publish loudly instead of silently. Net effect: the `ELICITATION_PREFER_HTTP_FALLBACK` opt-in introduced in `1.1.0` actually works end-to-end now (it never did under 0.3.5).

## [0.3.5] - 2026-04-26

### Changed

- Bundled `@pulsemcp/mcp-elicitation` upgraded to `1.1.0`, which adds the opt-in `ELICITATION_PREFER_HTTP_FALLBACK` env var. When set to `"true"` and HTTP fallback URLs are configured, the library uses the HTTP fallback even if the connected client advertises native elicitation. This fixes confirmation prompts silently auto-cancelling under headless agent runtimes (e.g., Claude Code under Agent Orchestrator) that falsely advertise the `elicitation` capability. Default behavior is unchanged.

## [0.3.4] - 2026-04-25

### Changed

- No-op patch bump to retrigger npm publish. The 0.3.3 publish was blocked because the prior bulk sync also bundled the GCS server, and the GCS functional-tests job hung in the public-repo CI for 6 hours, causing the publish workflow to time out for all four bundled servers. Bumping onepassword on its own to trigger an isolated sync.

## [0.3.3] - 2026-04-24

### Changed

- No-op patch bump to retrigger npm publish (previous version did not reach npm)

## [0.3.2] - 2026-04-24

### Added

- `onepassword_share_item` — wraps `op item share` to mint a time-limited share URL for an existing item (write group, gated by `OP_ELICITATION_WRITE`). Supports `expires_in` (e.g., `"2h"`, `"7d"`), recipient `emails`, and `view_once` flag (mutually exclusive with `emails`).
- `onepassword_create_api_credential` — wraps `op item create --category 'API Credential'` to create API Credential items with fields `credential`, `username`, `hostname`, `valid from`, `expires`, and `notesPlain` (write group, gated by `OP_ELICITATION_WRITE`). Date fields validated against `YYYY-MM-DD`.

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
