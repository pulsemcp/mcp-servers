# Changelog

All notable changes to the Google Flights MCP Server will be documented in this file.

## [Unreleased]

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
