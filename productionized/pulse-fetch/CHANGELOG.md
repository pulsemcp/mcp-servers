# Changelog

All notable changes to the Pulse Fetch MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.1] - 2025-06-30

### Added

- OPTIMIZE_FOR environment variable for controlling scraping strategy optimization
  - COST mode (default): Tries native first, then firecrawl, then brightdata
  - SPEED mode: Skips native and goes straight to firecrawl, then brightdata
- Comprehensive tests for both optimization modes
- Environment variable validation at startup for OPTIMIZE_FOR values

### Changed

- Refactored scrapeUniversal function to support different optimization strategies
- Updated documentation to explain the new optimization modes

## [0.1.0] - 2025-06-30

### Added

- Automatic scraping strategy system with intelligent selection and fallback logic
- Strategy configuration file using markdown table format (`scraping-strategies.md`)
- Auto-learning capability - successful strategies are saved for future use
- FilesystemStrategyConfigClient for managing strategy configuration
- Strategy abstraction layer supporting future backends (GCS, S3, database)
- Comprehensive test suite for strategy system (33 passing tests)
- Example configuration with common domains pre-configured
- Manual tests demonstrating strategy fallback with Yelp URL
- Environment variable `PULSE_FETCH_STRATEGY_CONFIG_PATH` for custom config file location
- Automatic initialization of strategy config in OS temp directory when environment variable not set

### Changed

- Refactored scraping logic into modular strategy functions (`scrapeUniversal`, `scrapeWithStrategy`, etc.)
- Enhanced scrape tool to use automatic strategy selection based on configuration
- Updated tool description to emphasize automatic optimization
- Improved dependency injection to include strategy configuration factory
- Strategy selection is now completely automatic - no manual strategy parameter exposed to users
- Renamed `native.fetch()` to `native.scrape()` for consistency with other scraping clients
- Documentation moved from separate STRATEGY_CONFIGURATION.md into main README
- Strategy config now defaults to OS temp directory instead of current working directory

## [0.0.4] - 2025-06-29

### Added

- Native scraping client class following MCP client architecture patterns
- Comprehensive manual test suite with individual client tests
- Class-based scraping client architecture (NativeScrapingClient, FirecrawlScrapingClient, BrightDataScrapingClient)
- Enhanced manual testing with one-liner commands for each scraping mode
- Detailed content analysis and response statistics in manual tests
- README documentation for manual test usage and debugging

### Changed

- Refactored scraping clients from functions to class-based implementations
- Improved manual test output with better formatting and analysis
- Enhanced error detection and success/failure reporting in tests

### Fixed

- Fixed missing README concatenation for npm publication: added `scripts/prepare-npm-readme.js` to properly merge main README with local configuration
- Local README now contains only local-specific configuration, allowing proper concatenation during publish
- Published npm package will now display full documentation instead of minimal local README
- Fixed import paths and TypeScript compilation issues in manual tests
- Improved error handling in scraping client classes

## [0.0.3] - 2025-06-29

### Fixed

- Fixed build configuration: TypeScript compilation now correctly outputs to `build/` directory instead of `dist/`
- Fixed package.json to include TypeScript declaration files in published package
- Package is now functional after installation from npm

## [0.0.2] - 2025-06-29

### Changed

- Package name changed from `pulse-fetch` to `@pulsemcp/pulse-fetch` for npm scoped publishing
- Updated bin entry to match new scoped package name

## [0.0.1] - 2025-06-29

### Added

- Initial implementation of pulse-fetch MCP server
- Smart scraping tool with fallback logic: native fetch → Firecrawl → BrightData Web Unlocker
- Firecrawl API integration for enhanced content extraction
- BrightData Web Unlocker integration for anti-bot bypass
- Comprehensive test suite (functional, integration, and mocks)
- CI/CD pipeline with GitHub Actions
- TypeScript support with proper build configuration
- Environment variable validation and service logging
- Input validation with Zod schemas
- Content truncation and pagination support
- Error handling with detailed error responses
