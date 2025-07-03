# Changelog

All notable changes to the Pulse Fetch MCP server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed incorrect MIME type detection for scraped resources
  - Resources now properly detect content type based on actual content (text/html, application/json, application/xml, text/plain)
  - Previously all resources were incorrectly marked as text/plain regardless of content
  - Added comprehensive functional tests for MIME type detection

## [0.2.7] - 2025-07-03

### Fixed

- Fixed silent authentication failures in scraping strategies
  - Authentication errors from Firecrawl and BrightData APIs are now immediately returned to users instead of being silently swallowed
  - Added detailed error messages that include the actual API response (e.g., "Invalid token", "Token expired")
  - Prevents confusing "All fallback strategies failed" messages when the real issue is invalid credentials

## [0.2.6] - 2025-07-03

### Fixed

- Fixed MCP protocol violations caused by console.log statements
  - Replaced all console.log and console.warn statements with proper logging to stderr
  - MCP protocol requires only JSON messages on stdout; debug messages must go to stderr
  - Updated files: scraping-strategies.ts, default-config.ts, html-cleaner.ts

### Changed

- Added @types/jsdom as dev dependency for TypeScript type definitions

## [0.2.5] - 2025-07-01

### Added

- Intelligent content cleaning with `cleanScrape` parameter
  - New `cleanScrape` parameter (default: true) controls whether to clean HTML content
  - Cleaning converts HTML to semantic Markdown, removing ads, navigation, and boilerplate
  - Achieves 50-90% content reduction while preserving main content
  - Pass-through cleaners for JSON, XML, and plain text content
  - Graceful fallback to raw content if cleaning fails
  - Cleaning is now decoupled from extraction - works independently

- Multi-tier resource storage with raw, cleaned, and extracted responses
  - Resources are now saved in three separate stages: raw (original content), cleaned (semantic content), and extracted (LLM-processed content)
  - FileSystem storage organizes files into `raw/`, `cleaned/`, and `extracted/` subdirectories
  - Each stage shares the same filename for easy correlation
  - Extraction prompt is saved as metadata in extracted files for full traceability
  - New `writeMulti` method in storage interface for atomic multi-stage writes
  - Memory storage updated to support the same multi-tier structure

### Changed

- **BREAKING**: Renamed "filter" concept to "clean" throughout the codebase
  - Storage subdirectory changed from `filtered/` to `cleaned/`
  - Resource type changed from `filtered` to `cleaned`
  - All related classes, methods, and files renamed for consistency

## [0.2.4] - 2025-07-01

### Changed

- Updated documentation to clarify dependency management in workspace packages

## [0.2.3] - 2025-07-01

### Fixed

- Fixed missing dependencies in published package
  - Added `@anthropic-ai/sdk` and `openai` to local package.json
  - These dependencies were only in shared/package.json causing ERR_MODULE_NOT_FOUND in published package

## [0.2.2] - 2025-07-01

### Fixed

- Fixed CI/CD dependency installation for npm workspaces
  - Added `ci:install` script to ensure dependencies are installed in all subdirectories
  - Prevents `ERR_MODULE_NOT_FOUND` errors when running published package
  - Updated CI workflows to use the new installation approach

## [0.2.1] - 2025-07-01

### Changed

- Updated default LLM models to latest 2025 versions
  - Anthropic: Changed from Claude Opus 4 to Claude Sonnet 4 (`claude-sonnet-4-20250514`)
  - OpenAI: Changed from GPT-4.1 to GPT-4.1 Mini (`gpt-4.1-mini`)
- These new defaults provide better cost efficiency while maintaining high quality extraction

## [0.2.0] - 2025-07-01

### Added

- Intelligent caching system for scraped content
  - Automatically caches scraped URLs as MCP Resources
  - Subsequent requests for the same URL return cached content (no API calls)
  - Shows "Served from cache" with original scrape method and timestamp
  - Dramatically improves performance for repeated requests
- `forceRescrape` parameter to bypass cache and force fresh content retrieval
  - Useful when you know the content has changed
  - Default: `false` (uses cache when available)
- `findByUrl` method in ResourceStorage interface
  - Enables efficient lookup of cached resources by original URL
  - Returns resources sorted by timestamp (most recent first)
- Extract feature for intelligent information extraction from scraped content using LLMs
  - Support for multiple LLM providers: Anthropic, OpenAI, and OpenAI-compatible providers
  - Configurable via environment variables (LLM_PROVIDER, LLM_API_KEY, LLM_API_BASE_URL, LLM_MODEL)
  - Extract parameter conditionally shown in scrape tool based on availability
  - Automatic content type detection (plain text for extracted content, HTML for raw scrapes)
  - Comprehensive test suite including functional and manual tests
  - Support for popular OpenAI-compatible providers: Together.ai, Groq, Perplexity, DeepSeek, Fireworks AI
  - Default models optimized for best value: Claude Sonnet 4 for Anthropic, GPT-4.1 Mini for OpenAI
  - Fallback to raw content if extraction fails with clear error messages
- CONTRIBUTING.md documentation with inspector commands and development workflow guidance

### Changed

- Scrape tool now checks for cached content before making network requests
- Cache hits include metadata about when content was originally cached
- Enhanced storage backends (memory and filesystem) with URL-based lookups
- Updated scrape tool to dynamically build schema based on available features
- Resource content type now depends on whether extraction was performed
- Resource descriptions include extraction query when extract parameter is used
- Updated default LLM models to latest 2025 versions (Claude Sonnet 4, GPT-4.1 Mini)
- Improved extract parameter documentation with comprehensive examples

## [0.1.4] - 2025-06-30

### Added

- Unified resource storage interface with support for multiple backends
  - Memory storage (default) - stores resources in memory, lost on restart
  - Filesystem storage - persists resources to disk as markdown files with YAML frontmatter
  - Configurable via `MCP_RESOURCE_STORAGE` environment variable
- Resource saving functionality in the scrape tool
  - Scraped content is automatically saved as MCP resources when `saveResource: true` (default)
  - Returns a resource link in the tool response for easy access
- Comprehensive test suite for resource storage implementations
- Environment variables for resource storage configuration:
  - `MCP_RESOURCE_STORAGE`: Choose storage backend (`memory` or `filesystem`)
  - `MCP_RESOURCE_FILESYSTEM_ROOT`: Directory for filesystem storage (defaults to `/tmp/pulse-fetch/resources`)

### Changed

- **BREAKING**: Simplified scrape tool parameters - removed `format`, `waitFor`, `removeBase64Images`, and `onlyMainContent` parameters
- Tool now returns raw HTML content without format transformations
- Default timeout increased to 60000ms (60 seconds) from unspecified default
- Renamed `saveResource` parameter to `saveResult` for clarity
- Simplified `extract` parameter from complex object to simple string description
- Improved tool description following MCP best practices guide
- Enhanced parameter descriptions with examples and clear defaults
- Updated `OPTIMIZE_FOR` environment variable values from uppercase to lowercase
  - `COST` → `cost` (default)
  - `SPEED` → `speed`
- Improved resource handlers to use the new storage interface
- Enhanced documentation with resource storage configuration examples

### Fixed

- Timeout parameter now properly propagates to native fetch strategy
- Improved timeout error messages to guide users on increasing timeout values
- Test isolation issues by adding proper temp directory cleanup

## [0.1.3] - 2025-06-30

[Note: This version was skipped due to merge conflict resolution]

## [0.1.2] - 2025-06-30

### Changed

- Enhanced automatic strategy learning to save URL patterns up to the last path segment
  - Simple extraction: removes the last segment from the URL path
  - Example: `yelp.com/biz/dolly-san-francisco` → `yelp.com/biz/`
  - Handles query parameters, fragments, and trailing slashes correctly
- Added comprehensive tests for URL pattern extraction functionality
- Updated documentation to explain the pattern-based learning system

### Fixed

- Test isolation issues by adding proper temp directory cleanup

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
