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

**MCP Implementation Search**: Search for MCP servers and clients in the PulseMCP registry.

**Toolgroups**: Enable/disable tool groups (newsletter, server_queue) via environment variable.

**Draft Control**: Manage draft posts before publishing to the newsletter.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name                    | Tool Group   | Description                                                                |
| ---------------------------- | ------------ | -------------------------------------------------------------------------- |
| `get_newsletter_posts`       | newsletter   | List newsletter posts with search, sorting, and pagination options.        |
| `get_newsletter_post`        | newsletter   | Retrieve a specific newsletter post by its unique slug.                    |
| `draft_newsletter_post`      | newsletter   | Create a new draft newsletter post with title, body, and metadata.         |
| `update_newsletter_post`     | newsletter   | Update an existing newsletter post's content and metadata (except status). |
| `upload_image`               | newsletter   | Upload an image and attach it to a specific newsletter post.               |
| `get_authors`                | newsletter   | Get a list of authors with optional search and pagination.                 |
| `search_mcp_implementations` | server_queue | Search for MCP servers and clients in the PulseMCP registry.               |

# Tool Groups

This server organizes tools into groups that can be selectively enabled or disabled:

- **newsletter** (6 tools): Newsletter management, image uploads, and author retrieval
- **server_queue** (1 tool): MCP implementation search functionality

You can control which tool groups are available by setting the `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS` environment variable as a comma-separated list (e.g., `newsletter,server_queue`). If not set, all tool groups are enabled by default.

# Usage Tips

- Use `get_newsletter_posts` to browse existing content before creating new posts
- When uploading images, both `post_slug` and `file_name` are required
- Draft posts allow you to prepare content without immediately publishing
- Search functionality supports finding posts by title, content, or metadata
- The update tool allows modifying all post metadata except status
- Use author slugs when creating posts (e.g., "sarah-chen", "john-doe")
- Use MCP server/client slugs for featured content (e.g., "github-mcp", "claude-desktop")
- Use `search_mcp_implementations` to discover MCP servers and clients in the PulseMCP registry
- Enable or disable specific toolgroups by setting `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS` environment variable

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
User: Create a draft newsletter post about the new weather MCP serverAssistant: I'll create a draft newsletter post about the new weather MCP server.

[Calls draft_newsletter_post with title, body, slug, and author_slug]

I've created a draft newsletter post titled "New Weather MCP Server: Real-time Forecasts in Your LLM" with the slug "weather-mcp-server-launch". The draft has been saved and can be edited or published later.
```

## Upload and Attach an Image

```
User: Upload this screenshot to the weather server post I just createdAssistant: I'll upload the screenshot and attach it to your weather server post.

[Calls upload_image with post_slug="weather-mcp-server-launch" and file_name="weather-dashboard.png"]

The screenshot has been successfully uploaded and attached to the "weather-mcp-server-launch" post. The image is now available at: https://storage.pulsemcp.com/images/newsletter/weather-dashboard.png
```

## Update an Existing Post

```
User: Update the weather post to include information about the new temperature alerts featureAssistant: I'll update the weather MCP server post to include information about the temperature alerts feature.

[Calls update_newsletter_post with slug="weather-mcp-server-launch" and updated content]

I've successfully updated the "New Weather MCP Server" post to include a section about the temperature alerts feature. The post now covers both the real-time forecasts and the new alert system.
```

## Search for MCP Implementations

```
User: Find MCP servers related to weather or climate
Assistant: I'll search for MCP servers related to weather and climate.

[Calls search_mcp_implementations with search="weather climate"]

I found 2 MCP servers related to weather and climate:

1. **Weather MCP Server** (weather-mcp)
   - Real-time weather data and forecasting capabilities

2. **Climate Data MCP Client** (climate-data-mcp)
   - Access climate research and environmental data
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
        "PULSEMCP_ADMIN_API_KEY": "your-api-key-here",
        "PULSEMCP_ADMIN_ENABLED_TOOLGROUPS": "newsletter,server_queue"
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
