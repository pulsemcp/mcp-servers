# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Wire up configurable `TIMEOUT` env var via `page.setDefaultTimeout()`
- Fix `getClaimDetails` matching logic that always matched the first claim card
- Remove unused `eobFileUrl`/`invoiceFileUrl` variables from `ClaimDetails` interface
- Replace `waitForLoadState('networkidle')` with `waitForSelector` + `waitForTimeout` to prevent SPA hangs
- Navigate `getHistoricalClaims` directly to `/claims/closed` instead of `/claims/active`
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
