# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-03-21

### Added

- Initial implementation of Aetna Claims MCP server
- Playwright-based browser automation for Aetna health portal (https://health.aetna.com)
- Email-based 2FA support via IMAP for login verification
- `submit_claim` tool with elicitation-based user confirmation (uses `@pulsemcp/mcp-elicitation`)
- `get_claims` tool to retrieve all insurance claims
- `get_claim_details` tool for detailed claim information with financial breakdown
- Support for Medical, Dental, Vision, and Pharmacy claim types
- Claim form fields: member selection, date range, amount, provider reimbursement, invoice upload
- Confirmation questions: accident, employment, outside US, other coverage
- Background login with stealth plugin for bot detection avoidance
- Functional tests with mock client
