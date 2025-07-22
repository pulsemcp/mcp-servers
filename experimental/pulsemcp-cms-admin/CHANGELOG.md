# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- `get_newsletter_post_by_id` tool to retrieve posts by numeric ID via supervisor endpoints
- `supervisor_get_newsletter_posts` tool for advanced listing with ID support and status filtering
- Supervisor API endpoints for enhanced administrative access:
  - `/supervisor/posts/:id` for fetching posts by numeric ID
  - `/supervisor/posts` for listing posts with additional filtering options
  - Support for create and update operations via supervisor endpoints
- API client functions for all supervisor endpoints:
  - `getPostById()` for fetching posts by numeric ID
  - `getSupervisorPosts()` for advanced post listing
  - `createSupervisorPost()` for creating posts via supervisor
  - `updateSupervisorPost()` for updating posts via supervisor

### Changed

- Exposed all missing supervisor capabilities to enable ID-based operations
- Enhanced API client exports to include both regular and supervisor functions

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
