# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- `get_draft_mcp_implementations` tool for retrieving paginated list of draft MCP implementations **with associated objects**
  - Automatically fetches and includes linked MCP Server details (name, description, classification, downloads)
  - Automatically fetches and includes linked MCP Client details (name, description, featured status, logo)
  - Provides complete context for reviewing drafts without additional API calls
- `save_mcp_implementation` tool for updating MCP implementations (replicates Admin panel "Save Changes" functionality)
- New types: `SaveMCPImplementationParams` for MCP implementation updates
- Extended `MCPImplementation` type to include optional `mcp_server` and `mcp_client` associated objects
- API client methods: `getDraftMCPImplementations` and `saveMCPImplementation`
- Comprehensive test coverage for new tools (30 new tests)
- Missing setup scripts: `local/setup-dev.js` and `scripts/run-vitest.js`

### Changed

- Tool groups updated: `server_queue` now contains 3 tools (was 1 tool)
- `get_draft_mcp_implementations` now fetches and populates associated MCP server/client objects for each implementation

## [0.1.0] - 2025-10-08

### Changed

- Updated @modelcontextprotocol/sdk from 1.13.2 to 1.19.1

## [0.0.4] - 2025-09-09

### Added

- Added `mcpName` field to package.json with value `com.pulsemcp.servers/pulsemcp-cms-admin` for MCP registry compatibility

## [0.0.3] - 2025-01-27

### Fixed

- Fixed nested subfolder issue in image uploads where the path was duplicated (e.g., newsletter/slug/newsletter/slug/file.png) by sending only filename in filepath parameter
- Updated tool descriptions to accurately reflect markdown-formatted responses
- Fixed get_newsletter_post to include all available fields (author ID, last_updated, short_title, table_of_contents)
- Fixed get_authors description to correctly note image_url field (not avatar_url)
- Fixed double-escaping of table_of_contents HTML strings in create-post and update-post operations
  - Now checks if table_of_contents is already a string before applying JSON.stringify
  - Preserves HTML content passed directly without additional escaping

### Changed

- get_newsletter_post now returns raw HTML for body and table_of_contents fields
- All tool descriptions now accurately describe the markdown format returned rather than JSON examples
- **BREAKING**: All tools now return slugs instead of IDs for better API consistency
  - `get_newsletter_post` now shows author slug instead of author ID
  - `get_newsletter_post` now shows MCP server/client slugs instead of IDs
  - `get_newsletter_posts` now shows author slug with name
- Enhanced output format to show both slug and ID for authors, MCP servers, and MCP clients
  - Format: "slug-name (ID: number)" for better debugging and reference
  - Applied to `get_newsletter_post`, `get_newsletter_posts`, and `get_authors` tools

### Added

- Added `getAuthorById`, `getMCPServerById`, and `getMCPClientById` methods to the API client
- Added comprehensive test coverage for slug-based outputs

## [0.0.2] - 2025-01-22

### Added

- Added missing npm publishing scripts (prepare-publish.js and prepare-npm-readme.js)

### Fixed

- Updated API client to handle Rails JSON responses with data/meta structure
- Fixed individual post retrieval using supervisor endpoint (`GET /supervisor/posts/:slug`)
- Fixed TypeScript types to properly handle all post fields
- Fixed ESLint and Prettier violations for CI compliance
- All manual tests now passing (9/9)

### Changed

- Individual post retrieval now uses `/supervisor/posts/:slug` endpoint which returns full post content including body
- Removed workaround that was using list endpoint for individual posts
- Authors, MCP servers, and MCP clients now use real API calls instead of mock data
- All resources are fetched from supervisor endpoints with full JSON support

## [0.0.1] - 2025-01-22

### Added

- Initial implementation of PulseMCP CMS Admin MCP server
- `get_newsletter_posts` tool to retrieve newsletter posts with search and pagination
- `get_newsletter_post` tool to fetch a specific post by slug
- `draft_newsletter_post` tool to create new newsletter drafts with full metadata support
- `update_newsletter_post` tool to update existing newsletter posts with all metadata fields (except status)
- `upload_image` tool to upload images to cloud storage (requires post_slug and file_name)
- `get_authors` tool to list authors with search and pagination
- Comprehensive post metadata support including SEO fields, images, and featured content
- Slug-based parameters for better usability (author_slug, featured_mcp_server_slugs, featured_mcp_client_slugs)
- Automatic slug-to-ID conversion for API compatibility
- Environment variable validation for API key configuration
- TypeScript implementation with strict type checking
- Comprehensive test infrastructure (functional, integration, manual)

### Implementation Notes

- Post status cannot be modified via `update_newsletter_post` - posts maintain their current status
- All parameters use slugs for consistency and ease of use
