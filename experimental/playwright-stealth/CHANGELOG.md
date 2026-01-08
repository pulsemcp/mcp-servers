# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Proxy support via `PROXY_URL`, `PROXY_USERNAME`, `PROXY_PASSWORD`, and `PROXY_BYPASS` environment variables
- Compatible with BrightData Residential Proxies and other HTTP/HTTPS proxy services
- Proxy health check on startup to verify connection before accepting requests
- `proxyEnabled` field in `browser_get_state` response to show current proxy status
- `logInfo` helper function for informational logging

## [0.0.2] - 2026-01-05

### Added

- Configurable Playwright timeout support via `page.setDefaultTimeout()` and `page.setDefaultNavigationTimeout()`
- New `NAVIGATION_TIMEOUT` environment variable (default: 60000ms) for page navigation operations like `page.goto()` and `page.reload()`
- `TIMEOUT` environment variable now applies to all Playwright actions (click, fill, etc.), not just `browser_execute` code execution

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
