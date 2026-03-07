# Changelog

All notable changes to the Google Flights MCP Server will be documented in this file.

## [Unreleased]

### Fixed

- Include "best flights" (Google's featured/highlighted flights) in search results. Previously, only the "other flights" section was parsed from Google's response, causing ~3 flights per search to be silently dropped — including flights that Google considers the best options for the route. This affected both one-way and round-trip searches.

## [0.2.0] - 2026-03-06

### Added

- `exclude_basic_economy` parameter on `search_flights` (default: `true`). Basic economy fares are now excluded by default since they typically have significant restrictions (no carry-on, no seat selection, non-refundable). Set to `false` to include all fare tiers.

## [0.1.2] - 2026-02-22

### Added

- `fare_brand` field on each flight result indicating the fare tier ("Economy", "Economy+", "Economy Flex"), derived from Google's numeric fare tier data. May be `null` when unavailable.
- `extensions` field on each flight result with `carry_on_included` (boolean) and `checked_bags_included` (number) to help distinguish basic economy from standard fares.

## [0.1.1] - 2026-02-16

### Changed

- Renamed npm package from `google-flights-google-mcp-server` to `google-flights-mcp-server`

## [0.1.0] - 2026-02-16

### Added

- Initial implementation of Google Flights MCP server
- `search_flights` tool with full configurability: trip type, seat class, passenger counts, max stops, sorting, pagination, and currency
- `get_date_grid` tool returning a date-price grid for finding the cheapest travel dates
- `find_airport_code` tool for looking up IATA airport codes by city name, airport name, or partial code
- Protobuf-based search parameter encoding (no API key required)
- Built-in rate limiting (1.5s between requests) to avoid Google rate limits
- Manual test suite covering domestic, international, transpacific, business class, pagination, and filtering
