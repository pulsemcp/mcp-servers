# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [0.0.1] - 2026-06-30

### Added

- Initial implementation of the FlightAware MCP server, wrapping FlightAware AeroAPI v4.
- `search_flights_by_ident` — look up flights and their live/scheduled status by flight number, tail number (registration), or `fa_flight_id`.
- `get_flight_track` — get the recorded position track (flown path) for a single flight via its `fa_flight_id`.
- `get_airport_info` — general airport information (name, ICAO/IATA/LID codes, location, timezone, elevation).
- `get_airport_flights` — an airport's flight board (arrivals, departures, scheduled flights).
- `get_airport_delays` — an airport's current delay category, total delay, and per-reason breakdown.
- Server configuration resource at `flightaware://config`.
- Functional tests with a mocked AeroAPI client, including HTTP-boundary tests that pin the AeroAPI request URLs, query keys, headers, and GET method via a mocked `fetch` (21 tests).
- Integration tests using TestMCPClient against the full MCP stdio protocol with a mocked AeroAPI boundary (14 tests).
- Manual tests for real AeroAPI validation (skip automatically when `AEROAPI_API_KEY` is unset).
- Documented design decision: the server is read-only (every tool is a GET). AeroAPI's alert feature is intentionally not wrapped — AeroAPI delivers alerts solely as HTTP POST webhooks to a caller-hosted server (no native SMS/email/push) and requires a Standard/Premium tier. To watch a flight or airport for changes, an agent polls the relevant read tool on an interval and diffs the results.
