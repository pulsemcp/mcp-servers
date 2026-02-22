# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed crash in result formatting when API returns null `routes`, `payment`, `segments`, or `transfer` fields in flight search results

## [0.2.5] - 2026-02-22

### Fixed

- Fixed crash when API returns `null` for the entire `data` envelope during polling (not just `data.result`)
  - v0.2.4 only guarded against `data.result` being null, but the `data` object itself can also be null in some environments
  - Polling now skips and continues when `data` is null/undefined instead of crashing
- Added error stack traces to search error output for easier debugging

### Added

- Regression tests for null `data` envelope, null `result` array, and all-null poll responses

## [0.2.4] - 2026-02-20

### Fixed

- Fixed crash when API returns `null` for `data.result` during polling (defensive null coalescing)

## [0.2.3] - 2026-02-20

### Fixed

- Fixed search failing with 404 after PointsYeah API changed `fetch_result` response format
  - API now returns `status: "processing" | "done"` instead of `completed_sub_tasks`/`total_sub_tasks`
  - Old code never broke out of the polling loop, causing task expiration and 404 errors
  - Polling now checks `data.status === 'done'` to determine completion
  - Results are accumulated across polls (API returns results in batches, not all at once)

## [0.2.2] - 2026-02-17

### Fixed

- **BREAKING**: Fixed search returning results for completely wrong routes (e.g., ICN->AMS when searching SFO->SAN)
  - Root cause: the explorer API (`/v2/live/explorer/search`) is a pre-crawled deals database that ignores search parameters entirely, returning random cached results
  - Migrated back to the live search API (`api2.pointsyeah.com`) which performs real-time route-specific searches
  - Uses Playwright to navigate to the PointsYeah search page, intercepting the encrypted `create_task` request, then polls `fetch_result` for incremental results
  - This is the same approach used by the PointsYeah website itself for its "Live Search" feature
- Fixed `get_search_history` failing due to dead `api.pointsyeah.com` host; migrated to `api2.pointsyeah.com`

### Changed

- Re-added `playwright` as a dependency (required for the live search encrypted request flow)
- Updated `search_flights` tool description to note live search timing (30-90 seconds)
- Added `search.ts` (Playwright-based task creation) and `fetch-results.ts` (HTTP polling)
- Added validation of `success` field in poll responses
- Added timeout warning when polling exhausts max attempts without completing
- Fixed results summary text to show flight option count instead of misleading "total in database"

### Removed

- Removed `explorer-search.ts` and all Explorer API types (no longer used)
- Removed explorer API manual test (the API returns wrong routes)
- Removed dead `API_BASE` constant (`api.pointsyeah.com/v2/live` is unreachable)

## [0.2.1] - 2026-02-17

### Fixed

- **BREAKING**: Fixed flight search tools not appearing after `set_refresh_token` authentication
  - MCP clients (including Claude Code SDK) don't support dynamic tool list changes via `tools/list_changed` notifications
  - All tools are now always visible; auth-requiring tools return a clear error directing users to `set_refresh_token` when not authenticated
  - Removed `sendToolListChanged()` dependency for client compatibility

### Changed

- `set_refresh_token` tool description updated to explain tools are always visible

## [0.2.0] - 2026-02-16

### Added

- Dynamic authentication flow with `set_refresh_token` tool
  - Server starts with only `set_refresh_token` when no valid token is available
  - Tool description includes step-by-step instructions for obtaining the token from browser cookies
  - After providing a valid token, flight search tools (`search_flights`, `get_search_history`) become available
  - If a token is later revoked or expires, server automatically switches back to `set_refresh_token`
- `authentication` section in `pointsyeah://config` resource showing auth status
- Centralized auth state management via `state.ts`
- Functional tests for `set_refresh_token` tool and auth state transitions

### Changed

- `POINTSYEAH_REFRESH_TOKEN` environment variable is now optional (server starts in auth-needed mode without it)
- Manual tests redesigned to always pass regardless of token availability
  - Unauthenticated tests verify the auth-needed UX (no token required)
  - Authenticated tests gracefully handle expired/revoked tokens

## [0.1.2] - 2026-02-16

### Fixed

- **BREAKING**: `search_flights` tool now works again (was returning 404 due to PointsYeah backend API migration)

### Changed

- Migrated flight search from old `api2.pointsyeah.com` task-based polling API to new `api.pointsyeah.com/v2/live/explorer/search` direct HTTP API
- Flight search no longer requires Playwright - uses direct HTTP requests to the explorer API
- Search results now include detail information fetched from CloudFront-hosted JSON endpoints

### Removed

- Playwright dependency (`playwright` package no longer required)
- Old task-based search infrastructure (`search.ts`, `fetch-results.ts`)
- `playwrightAvailable` server state tracking
- `API2_BASE` constant (old broken API endpoint)
- `setPlaywrightAvailable` export from shared module

## [0.1.1] - 2026-02-16

### Added

- Manual test suite covering all tools, resources, auth, and Playwright search
- Functional tests for client error handling and empty search results
- `playwright` as a direct dependency so flight search works when installed via `npx`

### Changed

- Added token refresh mutex to prevent concurrent Cognito refresh calls
- Extracted shared constants (API URLs, Cognito config, fetch timeout) to `constants.ts`
- Added `AbortSignal.timeout` to all HTTP fetch calls for consistent request timeouts
- Classified `search_flights` as a write operation (removed from `readonly` tool group)
- Improved 401 retry logic to reuse `ensureTokens()` instead of calling `refreshCognitoTokens` directly
- Made `clientFactory` required in `createMCPServer` (removed dead default factory)
- Server version in config resource is now read from package.json instead of being hardcoded
- Playwright type interfaces are now imported from `search.ts` instead of being duplicated in local entry point

### Removed

- `get_flight_recommendations` tool and Explorer flight deals API
- `get_hotel_recommendations` tool and Explorer hotel deals API
- `get_explorer_count` tool and Explorer count API
- `get_user_membership` tool and membership API
- `get_user_preferences` tool and preferences API
- Unused re-export file `pointsyeah-client.ts`
- Unused types from `types.ts` (`ExplorerRecommendParamsSchema`, `UserMembership`, `UserPreferences`, `SearchHistoryEntry`)
- Dead `registerTools` function and export from shared module

### Fixed

- `prepare-publish.js` now exits with code 1 on unhandled errors

## [0.1.0] - 2026-02-16

### Added

- Initial implementation of PointsYeah MCP server
- Award flight search across 20+ airline loyalty programs via Playwright
- HTTP polling for incremental search results
- Bank transfer program comparison (Chase, Amex, Citi, Capital One, Bilt, WF)
- AWS Cognito authentication with lazy token refresh
- `search_flights` tool for award flight search
- `get_search_history` tool for past searches
- `get_user_membership` tool for account info
- `get_user_preferences` tool for saved preferences
- `get_flight_recommendations` tool for Explorer flight deals
- `get_hotel_recommendations` tool for Explorer hotel deals
- `get_explorer_count` tool for deal count
- `pointsyeah://config` resource for server status
- Functional tests for all tools
- Integration tests with TestMCPClient
