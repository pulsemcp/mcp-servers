# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-01-03

### Added

- Initial release of Playwright Stealth MCP Server
- `browser_execute` tool for running Playwright code with access to `page` object
- `browser_screenshot` tool for capturing page screenshots
- `browser_get_state` tool for checking browser state and configuration
- `browser_close` tool for closing browser sessions
- Optional stealth mode using `playwright-extra` and `puppeteer-extra-plugin-stealth`
- Configurable via environment variables: `STEALTH_MODE`, `HEADLESS`, `TIMEOUT`
- Persistent browser sessions across tool calls
- Console output capture from page execution
- Full Playwright API access through code execution
