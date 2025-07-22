# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- Initial implementation of PulseMCP CMS Admin MCP server
- `get_newsletter_posts` tool to retrieve newsletter posts with search and pagination
- `get_newsletter_post` tool to fetch a specific post by slug
- `draft_newsletter_post` tool to create new newsletter drafts with full metadata support
- `update_newsletter_post` tool to update existing newsletter posts with all metadata fields (except status)
- `upload_image` tool to upload images to cloud storage (requires post_slug and file_name)
- `get_authors` tool to list authors with search and pagination
- Support for all post metadata fields: title, body, slug, status, category, image_url, preview_image_url, share_image, title_tag, short_title, short_description, description_tag, last_updated, table_of_contents
- Support for using slugs instead of IDs:
  - `author_slug` instead of `author_id` in draft_newsletter_post
  - `featured_mcp_server_slugs` instead of `featured_mcp_server_ids`
  - `featured_mcp_client_slugs` instead of `featured_mcp_client_ids`
- Automatic slug-to-ID conversion for seamless API integration
- Environment variable validation for API key configuration
- TypeScript implementation with strict type checking
- Comprehensive test infrastructure (functional, integration, manual)

### Changed

- **BREAKING**: `draft_newsletter_post` now requires `author_slug` instead of `author_id`
- **BREAKING**: Featured content now uses slugs instead of IDs in both draft and update tools
- Removed ability to modify post status in `update_newsletter_post` (posts remain in their current status)
