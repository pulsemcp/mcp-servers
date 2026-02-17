# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING**: Consolidate `get_active_claims` and `get_historical_claims` into single `get_claims` tool that returns all claims (both active and historical)

### Fixed

- Fix login timeout caused by `page.waitForURL` hanging when third-party resources fail to load (e.g. blocked analytics scripts). Replace `Promise.all([waitForURL, click])` with `click()` + `waitForFunction()` polling for URL change or dashboard elements
- Fix false-positive login error detection by narrowing error selector from `[class*="error"]` (matched layout classes) to `.error-text, [role="alert"]` with empty text check
- Fix claim details field selector to support both `<textarea>` and `<input>` elements (site changed form element type)
- Fix `playwright-extra` import to use two-step import for ESM compatibility
- Add debug screenshot on login failure for troubleshooting
- Fix EOB/Invoice document downloads by intercepting popup tabs with blob: URLs instead of relying on browser download events
- Wire up configurable `TIMEOUT` env var via `page.setDefaultTimeout()`
- Fix `getClaimDetails` matching logic that always matched the first claim card
- Remove unused `eobFileUrl`/`invoiceFileUrl` variables from `ClaimDetails` interface
- Replace `waitForLoadState('networkidle')` with `waitForSelector` + `waitForTimeout` to prevent SPA hangs
- Navigate directly to `/claims/closed` for historical claims instead of `/claims/active`
- Add early return in `prepareClaimToSubmit` when submit button is not found
- Use more specific form error selectors to avoid false positives
- Include index in generated claim IDs for uniqueness
- Extract shared `extractClaimsFromPage` helper to reduce code duplication
- Add `extractHistoricalClaimsFromPage` for history tab's different DOM structure
- Click "View all" on history page to expand beyond the default 3 most recent claims per pet
- Fix pet name extraction in `getClaimDetails` using DOM selectors instead of unreliable regex
- Fix login flow to use `Promise.all([waitForURL, click])` to avoid "Execution context destroyed" errors
- Update Chrome user agent string to recent version (131)
- Document pet selection limitation for multi-pet accounts
- Remove duplicate `waitForTimeout` in `submitClaim`
- Replace non-null assertions with explicit null checks in `getReadyClient`
- Support multi-word pet names in active claim detail popup extraction
- Add `policyNumber` field to `ClaimDetails` interface and tool output
- Add confirmation token expiry (2 minutes) to prevent stale form submissions
- Return error instead of silently falling back to first claim when `getClaimDetails` cannot find the requested claim ID
- Update README.md to reflect consolidated `get_claims` tool and correct login timing description
- Align `@types/node` version across all package.json files
- Fix manual test claim ID regex to match lowercase generated IDs

## [0.1.0] - 2026-02-08

### Added

- Initial release of Fetch Pet MCP Server
- `prepare_claim_to_submit` tool - Prepare and validate claim forms without submitting
- `submit_claim` tool - Submit prepared claims with confirmation token for safety
- `get_active_claims` tool - View pending/processing claims
- `get_historical_claims` tool - View completed/approved/denied claims
- `get_claim_details` tool - Get detailed claim info including EOB and invoice downloads
- Playwright-based browser automation with stealth mode
- Background login support for faster tool response
- Automatic document downloads (EOB, invoices) to configurable directory
- Comprehensive test suite (functional, integration, manual)
