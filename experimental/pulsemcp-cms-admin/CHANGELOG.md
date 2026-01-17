# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [0.5.0] - 2026-01-17

### Changed

- **BREAKING**: Simplified tool group system with new environment variables
  - Each tool group has two variants: base (read + write) and `_readonly` (read only)
  - Tool groups: `newsletter`, `newsletter_readonly`, `server_queue`, `server_queue_readonly`, `official_queue`, `official_queue_readonly`
  - New `TOOL_GROUPS` env var (replaces `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS`)
  - Mix and match base and readonly groups for different access levels per group

### Migration Guide

**If you were using `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS`:**

| Old Configuration                                           | New Configuration                     |
| ----------------------------------------------------------- | ------------------------------------- |
| `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS=newsletter`              | `TOOL_GROUPS=newsletter`              |
| `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS=server_queue_all`        | `TOOL_GROUPS=server_queue`            |
| `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS=server_queue_readonly`   | `TOOL_GROUPS=server_queue_readonly`   |
| `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS=official_queue_all`      | `TOOL_GROUPS=official_queue`          |
| `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS=official_queue_readonly` | `TOOL_GROUPS=official_queue_readonly` |

**New feature:** You can now have different access levels per group by mixing base and readonly groups:

- `TOOL_GROUPS=newsletter,server_queue_readonly` - Full newsletter access, read-only server queue

**No changes required if:** You weren't setting any tool group environment variables (all tools enabled by default)

## [0.4.4] - 2025-12-29

### Fixed

- Fixed empty validation error messages in `save_mcp_implementation` tool
  - When the Rails backend returns a 422 with an empty `errors` array, the tool now shows "Unknown validation error" instead of just "Validation failed: " (empty after colon)
  - Added support for Rails `error` string format in addition to `errors` array format
  - This fix also applied to `create_post`, `update_post`, and email sending error handling

## [0.4.3] - 2025-12-29

### Fixed

- Fixed empty array handling for `canonical` and `remote` parameters in `save_mcp_implementation`
  - Passing `canonical: []` now correctly sends the empty array marker to Rails, triggering deletion of all canonical URLs
  - Passing `remote: []` now correctly sends the empty array marker to Rails, triggering deletion of all remote endpoints
  - Previously, empty arrays were being omitted from the API request due to the `length > 0` check

## [0.4.2] - 2025-12-21

### Changed

- **BREAKING**: Shortened two tool names to prevent exceeding Claude's 64-character limit when combined with MCP server name prefix:
  - `approve_official_mirror_queue_item_without_modifying` → `approve_mirror_no_modify`
  - `send_mcp_implementation_posting_notification` → `send_impl_posted_notif`
- Users with long MCP server configuration names (e.g., `pulsemcp-admin-submission-queue-readonly`) should update their code to use the new shorter tool names

## [0.4.1] - 2025-12-21

### Fixed

- Fixed `save_mcp_implementation` `url` parameter not updating the implementation URL
  - The API client was sending `mcp_implementation[url]` but the Rails backend expects `mcp_implementation[marketing_url]`
  - Now correctly sends the `url` parameter value as `marketing_url` to the backend

## [0.4.0] - 2025-12-18

### Added

- Added official mirror queue management tools for managing MCP Registry server.json submissions:
  - `get_official_mirror_queue_items`: List and filter official mirror queue entries with pagination and search
  - `get_official_mirror_queue_item`: Get detailed information about a single queue entry including all mirror versions
  - `approve_official_mirror_queue_item`: Approve a queue entry and link it to an existing MCP server (async operation)
  - `approve_official_mirror_queue_item_without_modifying`: Approve without updating the linked server
  - `reject_official_mirror_queue_item`: Reject a queue entry (async operation)
  - `add_official_mirror_to_regular_queue`: Convert a queue entry to a draft MCP implementation (async operation)
  - `unlink_official_mirror_queue_item`: Unlink a queue entry from its linked MCP server
- Added two new tool groups:
  - `official_queue_readonly`: Read-only access to official mirror queue (list, get)
  - `official_queue_all`: Full access including approve, reject, unlink, and add to regular queue
- Added comprehensive TypeScript types for official mirror queue API responses
- Added functional tests for all new official mirror queue tools
- Added configurable API base URL via `PULSEMCP_ADMIN_API_URL` environment variable for testing against staging or other environments

## [0.3.3] - 2025-12-16

### Added

- Added `content` parameter to `send_mcp_implementation_posting_notification` tool for customizing email body content
  - Use `${implementationUrl}` placeholder to insert the link to the live implementation
  - Falls back to the default email template when not provided

## [0.3.2] - 2025-11-30

### Added

- Added implementation ID to `search_mcp_implementations` results, enabling follow-up operations like `save_mcp_implementation` and `send_mcp_implementation_posting_notification` that require the implementation ID

## [0.3.1] - 2025-11-28

### Added

- Added `find_providers` tool for searching and retrieving provider information:
  - Find by ID: Retrieve a specific provider by its numeric ID
  - Search by query: Search for providers by name, URL, or slug with pagination support
  - Returns provider details including name, slug, URL, implementation counts, and timestamps
  - Available in both `server_queue_readonly` and `server_queue_all` tool groups

### Fixed

- Fixed `save_mcp_implementation` to use correct Rails nested attributes parameter format for remote endpoints and canonical URLs
  - Changed `mcp_implementation[remote][0][field]` to `mcp_implementation[remote_attributes][0][field]`
  - Changed `mcp_implementation[canonical][0][field]` to `mcp_implementation[canonical_attributes][0][field]`
  - This fix aligns with Rails `accepts_nested_attributes_for` convention
  - Verified working with production API: remote and canonical data now persists correctly

### Changed

- Enhanced `search_mcp_implementations` tool to display remote endpoint information (hosting platforms, transport methods, authentication, cost) and canonical URLs for MCP implementations, bringing it to parity with `get_draft_mcp_implementations`

## [0.3.0] - 2025-11-26

### Added

- Added remote endpoint configuration support to `save_mcp_implementation` tool:
  - `remote`: Array of remote endpoint configurations for MCP servers
  - Each remote can specify: id (existing or blank for new), url_direct, url_setup, transport (e.g., "sse"), host_platform (e.g., "smithery", "superinterface"), host_infrastructure (e.g., "cloudflare"), authentication_method (e.g., "open", "oauth"), cost (e.g., "free", "paid"), status, display_name, and internal_notes
- Added canonical URL support to `save_mcp_implementation` tool:
  - `canonical`: Array of canonical URL configurations
  - Each entry specifies: url (the canonical URL), scope (one of "domain", "subdomain", "subfolder", or "url"), and optional note
- Updated type definitions to include `RemoteEndpointParams` and `CanonicalUrlParams` interfaces
- Updated `MCPServerRemote` interface to match current API response format (url_direct, url_setup, host_infrastructure, authentication_method, status)

### Changed

- Updated `get_draft_mcp_implementations` tool to display remote endpoints using updated field names (url_direct, url_setup, authentication_method)

## [0.2.0] - 2025-11-25

### Added

- Added provider creation/linking fields to `save_mcp_implementation` tool:
  - `provider_id`: Use `"new"` to create a new provider, or a numeric ID to link an existing one. Required when setting status to "live".
  - `provider_slug`: URL-friendly provider identifier (auto-generated from name if omitted)
  - `provider_url`: Provider website URL for deduplication
- Added GitHub repository fields to `save_mcp_implementation` tool:
  - `github_owner`: GitHub organization or username that owns the repository
  - `github_repo`: GitHub repository name
  - `github_subfolder`: Subfolder path for monorepos
- Added `internal_notes` field to `save_mcp_implementation` for admin-only notes
- Added support for `null` values in `github_stars` field (for implementations without GitHub repos)

### Fixed

- Fixed `get_newsletter_posts` tool timeout by adding caching to author lookups (was making N+1 API calls for each post)
- Fixed manual tests to properly load `.env` file for `send-email.manual.test.ts`
- Fixed manual tests to fail on API errors instead of silently passing (more transparent test results)

### Changed

- Enhanced `get_draft_mcp_implementations` tool to display much richer data per implementation:
  - Added full provider details (URL, slug)
  - Added full GitHub repository info (owner, repo, subfolder, status, last updated)
  - Added internal notes display
  - MCP Server inline data now includes: tags, remotes (with transport/host/auth/cost), download metrics by time period (week, 4-weeks), visitor estimates, registry package info
  - **BREAKING (API dependency)**: Requires updated PulseMCP Admin API that returns inline `mcp_server` and `mcp_client` objects with expanded data
- Removed N+1 API fetching for MCP servers/clients - now uses inline data from API response
- Added new types: `MCPServerTag`, `MCPServerRemote` for tag and remote endpoint data

## [0.1.1] - 2025-11-20

_Note: This release updates both the main package (0.2.1) and local package (0.1.1) versions._

### Added

- `send_mcp_implementation_posting_notification` tool for sending email notifications when MCP implementations go live
  - Sends thank you emails to submitters when their implementation is published
  - Automatically extracts recipient email from implementation's internal notes
  - Supports overriding email parameters (from, to, reply-to addresses)
  - Includes direct link to the live implementation on PulseMCP
  - Part of the `server_queue_all` tool group
- `sendEmail` method added to IPulseMCPAdminClient interface
- `send-email.ts` client implementation for calling the new admin API email endpoint
- Extended `MCPImplementation` type to include optional `internal_notes` field
- Comprehensive test coverage for the new email notification tool (9 functional tests)
- Integration with the upcoming PulseMCP Admin API `/admin/api/emails` endpoint

## [0.2.0] - 2025-11-17

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
- Manual tests for new tools with comprehensive coverage (26/29 passing)

### Changed

- **BREAKING**: Tool groups reorganized into 3 groups (was 2 groups):
  - `newsletter`: All newsletter-related tools (6 tools)
  - `server_queue_readonly`: Read-only server queue tools (2 tools: search, get_drafts)
  - `server_queue_all`: All server queue tools including write operations (3 tools: search, get_drafts, save)
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
