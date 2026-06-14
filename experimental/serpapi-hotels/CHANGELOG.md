# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.0.4] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.0.3] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.0.2] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

## [0.0.1] - 2026-02-16

### Added

- Initial implementation of SerpAPI Hotels MCP server
- `search_hotels` tool for searching hotels with Google Hotels via SerpAPI
  - Support for price, rating, star class, and amenity filters
  - Sorting by price, rating, or number of reviews
  - Pagination via next_page_token
  - Currency and localization options
  - Vacation rental search mode
- `get_hotel_details` tool for detailed hotel information
  - Prices from multiple booking sources
  - Review sentiment breakdown by category
  - Full amenity lists and nearby places
- `get_hotel_reviews` tool for individual guest reviews
  - Full review text snippets with ratings and sub-ratings
  - Sorting by most helpful, most recent, highest/lowest score
  - Filtering by review category or source
  - Hotel management responses
  - Pagination support
- Server configuration resource at `serpapi-hotels://config`
- Functional tests with mocked SerpAPI client
- Integration tests using TestMCPClient
- Manual tests for real API validation
- Date validation: check_out_date must be after check_in_date, invalid calendar dates rejected (e.g., Feb 31)
- 30-second request timeout on SerpAPI HTTP calls
