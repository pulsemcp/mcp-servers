# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3] - 2026-01-08

### Added

- Screenshot resource storage: Screenshots are now saved to filesystem storage and accessible via MCP resources
- New `SCREENSHOT_STORAGE_PATH` environment variable to configure screenshot storage location (default: `/tmp/playwright-screenshots`)
- New `resultHandling` parameter for `browser_screenshot` tool:
  - `saveAndReturn` (default): Saves to storage AND returns inline base64 image
  - `saveOnly`: Saves to storage and returns only the resource URI (more efficient for large screenshots)
- MCP Resources support: Clients can list and read saved screenshots via `resources/list` and `resources/read` handlers
- Resource links are returned from `browser_screenshot` tool with `file://` URIs

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
