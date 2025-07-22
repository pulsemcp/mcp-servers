# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

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
