# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
