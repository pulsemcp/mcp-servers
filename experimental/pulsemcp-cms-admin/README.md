# PulseMCP CMS Admin MCP Server

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server for managing PulseMCP's content management system. It provides tools for newsletter management and content operations through direct integration with the [PulseMCP Admin API](https://admin.pulsemcp.com).

**Note**: This is an internal tool for the PulseMCP team. The source code is public for reference purposes, but the server requires API keys that are not publicly available.

# Table of Contents

- [Highlights](#highlights)
- [Capabilities](#capabilities)
- [Usage Tips](#usage-tips)
- [Examples](#examples)
- [Setup](#setup)
  - [Cheatsheet](#cheatsheet)
  - [Claude Desktop](#claude-desktop)
    - [Manual Setup](#manual-setup)

# Highlights

**Newsletter Management**: Create, update, and retrieve newsletter posts with full content control.

**Image Uploads**: Upload images to cloud storage and attach them to newsletter posts.

**Content Search**: Find newsletter posts with powerful search and pagination capabilities.

**Draft Control**: Manage draft posts before publishing to the newsletter.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name                         | Description                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------ |
| `get_newsletter_posts`            | List newsletter posts with search, sorting, and pagination options.            |
| `get_newsletter_post`             | Retrieve a specific newsletter post by its unique slug.                        |
| `get_newsletter_post_by_id`       | Retrieve a specific newsletter post by its numeric ID via supervisor endpoint. |
| `supervisor_get_newsletter_posts` | List posts via supervisor endpoint with ID support and advanced filtering.     |
| `draft_newsletter_post`           | Create a new draft newsletter post with title, body, and metadata.             |
| `update_newsletter_post`          | Update an existing newsletter post's content and metadata (except status).     |
| `upload_image`                    | Upload an image and attach it to a specific newsletter post.                   |
| `get_authors`                     | Get a list of authors with optional search and pagination.                     |

# Usage Tips

- Use `get_newsletter_posts` to browse existing content before creating new posts
- When uploading images, both `post_slug` and `file_name` are required
- Draft posts allow you to prepare content without immediately publishing
- Search functionality supports finding posts by title, content, or metadata
- The update tool allows modifying all post metadata except status
- Use author slugs when creating posts (e.g., "sarah-chen", "john-doe")
- Use MCP server/client slugs for featured content (e.g., "github-mcp", "claude-desktop")

# Examples

## Search for Newsletter Posts

```
User: Can you find all newsletter posts about MCP servers?
Assistant: I'll search for newsletter posts about MCP servers.

[Calls get_newsletter_posts with search="MCP servers"]

I found 3 newsletter posts about MCP servers:

1. **"Top 10 MCP Servers This Week"** (2024-01-15)
   - Weekly roundup of the most popular MCP servers

2. **"Building Your First MCP Server"** (2024-01-08)
   - Tutorial on creating custom MCP servers

3. **"MCP Server Security Best Practices"** (2023-12-28)
   - Guide to securing MCP server deployments
```

## Create a Draft Post

```
User: Create a draft newsletter post about the new weather MCP server

Assistant: I'll create a draft newsletter post about the new weather MCP server.

[Calls draft_newsletter_post with title, body, slug, and author_slug]

I've created a draft newsletter post titled "New Weather MCP Server: Real-time Forecasts in Your LLM" with the slug "weather-mcp-server-launch". The draft has been saved and can be edited or published later.
```

## Upload and Attach an Image

```
User: Upload this screenshot to the weather server post I just created

Assistant: I'll upload the screenshot and attach it to your weather server post.

[Calls upload_image with post_slug="weather-mcp-server-launch" and file_name="weather-dashboard.png"]

The screenshot has been successfully uploaded and attached to the "weather-mcp-server-launch" post. The image is now available at: https://storage.pulsemcp.com/images/newsletter/weather-dashboard.png
```

## Get Post by ID

```
User: Get the newsletter post with ID 123

Assistant: I'll retrieve the newsletter post with ID 123.

[Calls get_newsletter_post_by_id with id=123]

I found the post:

**Title**: "Building Advanced MCP Integrations"
**ID**: 123
**Slug**: building-advanced-mcp-integrations
**Status**: published
**Author**: Sarah Chen

The post covers advanced techniques for building MCP integrations, including:
- Custom tool development
- Resource management patterns
- Error handling best practices
- Performance optimization strategies
```

## Update an Existing Post

```
User: Update the weather post to include information about the new temperature alerts feature

Assistant: I'll update the weather MCP server post to include information about the temperature alerts feature.

[Calls update_newsletter_post with slug="weather-mcp-server-launch" and updated content]

I've successfully updated the "New Weather MCP Server" post to include a section about the temperature alerts feature. The post now covers both the real-time forecasts and the new alert system.
```

# Setup

## Cheatsheet

Quick setup:

```bash
# Install dependencies
npm run install-all

# Build the server
npm run build

# Set your API key
export PULSEMCP_ADMIN_API_KEY="your-api-key-here"

# Run the server
cd local && npm start
```

## Claude Desktop

Add to your Claude Desktop configuration:

### macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

### Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pulsemcp-cms-admin": {
      "command": "node",
      "args": ["/path/to/pulsemcp-cms-admin/local/build/index.js"],
      "env": {
        "PULSEMCP_ADMIN_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Manual Setup

If you prefer to run the server manually:

```bash
cd /path/to/pulsemcp-cms-admin/local
PULSEMCP_ADMIN_API_KEY="your-api-key-here" node build/index.js
```

## License

MIT
