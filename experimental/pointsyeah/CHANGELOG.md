# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
