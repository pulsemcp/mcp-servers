# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Manual test suite covering all tools, resources, auth, and Playwright search

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
