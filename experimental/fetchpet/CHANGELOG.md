# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
