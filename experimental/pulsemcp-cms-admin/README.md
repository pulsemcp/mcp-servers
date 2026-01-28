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

**Tool Groups**: Enable/disable tool groups via `TOOL_GROUPS` environment variable. Each group has a base variant (full access) and a `_readonly` variant (read-only access).

**Draft Control**: Manage draft posts before publishing to the newsletter.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name                              | Tool Group         | Read/Write | Description                                                                   |
| -------------------------------------- | ------------------ | ---------- | ----------------------------------------------------------------------------- |
| `get_newsletter_posts`                 | newsletter         | read       | List newsletter posts with search, sorting, and pagination options.           |
| `get_newsletter_post`                  | newsletter         | read       | Retrieve a specific newsletter post by its unique slug.                       |
| `draft_newsletter_post`                | newsletter         | write      | Create a new draft newsletter post with title, body, and metadata.            |
| `update_newsletter_post`               | newsletter         | write      | Update an existing newsletter post's content and metadata (except status).    |
| `upload_image`                         | newsletter         | write      | Upload an image and attach it to a specific newsletter post.                  |
| `get_authors`                          | newsletter         | read       | Get a list of authors with optional search and pagination.                    |
| `search_mcp_implementations`           | server_queue       | read       | Search for MCP servers and clients in the PulseMCP registry.                  |
| `get_draft_mcp_implementations`        | server_queue       | read       | Retrieve paginated list of draft MCP implementations needing review.          |
| `find_providers`                       | server_queue       | read       | Search for providers by ID, name, URL, or slug.                               |
| `save_mcp_implementation`              | server_queue       | write      | Update an MCP implementation (replicates Admin panel "Save Changes" button).  |
| `send_impl_posted_notif`               | server_queue       | write      | Send email notification when MCP implementation goes live.                    |
| `get_official_mirror_queue_items`      | official_queue     | read       | List and filter official mirror queue entries with pagination and search.     |
| `get_official_mirror_queue_item`       | official_queue     | read       | Get detailed information about a single official mirror queue entry.          |
| `approve_official_mirror_queue_item`   | official_queue     | write      | Approve a queue entry and link it to an existing MCP server (async).          |
| `approve_mirror_no_modify`             | official_queue     | write      | Approve without updating the linked server.                                   |
| `reject_official_mirror_queue_item`    | official_queue     | write      | Reject a queue entry (async operation).                                       |
| `add_official_mirror_to_regular_queue` | official_queue     | write      | Convert a queue entry to a draft MCP implementation (async).                  |
| `unlink_official_mirror_queue_item`    | official_queue     | write      | Unlink a queue entry from its linked MCP server.                              |
| `get_unofficial_mirrors`               | unofficial_mirrors | read       | List unofficial mirrors with search, pagination, and MCP server filtering.    |
| `get_unofficial_mirror`                | unofficial_mirrors | read       | Get detailed unofficial mirror info by ID or name.                            |
| `create_unofficial_mirror`             | unofficial_mirrors | write      | Create a new unofficial mirror entry with JSON data.                          |
| `update_unofficial_mirror`             | unofficial_mirrors | write      | Update an existing unofficial mirror by ID.                                   |
| `delete_unofficial_mirror`             | unofficial_mirrors | write      | Delete an unofficial mirror by ID (irreversible).                             |
| `get_official_mirrors`                 | official_mirrors   | read       | List official mirrors with search, status, and processing filters.            |
| `get_official_mirror`                  | official_mirrors   | read       | Get detailed official mirror info by ID or name.                              |
| `get_tenants`                          | tenants            | read       | List tenants with search and admin status filtering.                          |
| `get_tenant`                           | tenants            | read       | Get detailed tenant info by ID or slug.                                       |
| `get_mcp_jsons`                        | mcp_jsons          | read       | List MCP JSON configs with mirror and server filtering.                       |
| `get_mcp_json`                         | mcp_jsons          | read       | Get a single MCP JSON configuration by ID.                                    |
| `create_mcp_json`                      | mcp_jsons          | write      | Create a new MCP JSON configuration for an unofficial mirror.                 |
| `update_mcp_json`                      | mcp_jsons          | write      | Update an existing MCP JSON configuration by ID.                              |
| `delete_mcp_json`                      | mcp_jsons          | write      | Delete an MCP JSON configuration by ID (irreversible).                        |
| `list_mcp_servers`                     | mcp_servers        | read       | List/search MCP servers with filtering by status, classification, pagination. |
| `get_mcp_server`                       | mcp_servers        | read       | Get detailed MCP server info by slug (unified view of all admin UI fields).   |
| `update_mcp_server`                    | mcp_servers        | write      | Update an MCP server's fields (all admin UI fields supported).                |
| `get_redirects`                        | redirects          | read       | List URL redirects with search, status filtering, and pagination.             |
| `get_redirect`                         | redirects          | read       | Get detailed redirect info by ID.                                             |
| `create_redirect`                      | redirects          | write      | Create a new URL redirect entry.                                              |
| `update_redirect`                      | redirects          | write      | Update an existing URL redirect by ID.                                        |
| `delete_redirect`                      | redirects          | write      | Delete a URL redirect by ID (irreversible).                                   |

# Tool Groups

This server organizes tools into groups that can be selectively enabled or disabled. Each group has two variants:

- **Base group** (e.g., `newsletter`): Full read + write access
- **Readonly group** (e.g., `newsletter_readonly`): Read-only access

## Available Groups

| Group                         | Tools | Description                                  |
| ----------------------------- | ----- | -------------------------------------------- |
| `newsletter`                  | 6     | Full newsletter management (read + write)    |
| `newsletter_readonly`         | 3     | Newsletter read-only (get posts, authors)    |
| `server_queue`                | 5     | Full MCP implementation queue (read + write) |
| `server_queue_readonly`       | 3     | MCP implementation queue read-only           |
| `official_queue`              | 7     | Full official mirror queue (read + write)    |
| `official_queue_readonly`     | 2     | Official mirror queue read-only              |
| `unofficial_mirrors`          | 5     | Full unofficial mirrors CRUD (read + write)  |
| `unofficial_mirrors_readonly` | 2     | Unofficial mirrors read-only                 |
| `official_mirrors`            | 2     | Official mirrors REST API (read-only)        |
| `official_mirrors_readonly`   | 2     | Official mirrors read-only (alias)           |
| `tenants`                     | 2     | Tenants REST API (read-only)                 |
| `tenants_readonly`            | 2     | Tenants read-only (alias)                    |
| `mcp_jsons`                   | 5     | Full MCP JSON configurations (read + write)  |
| `mcp_jsons_readonly`          | 2     | MCP JSON configurations read-only            |
| `mcp_servers`                 | 3     | Full MCP servers management (read + write)   |
| `mcp_servers_readonly`        | 2     | MCP servers read-only (list, get)            |
| `redirects`                   | 5     | Full URL redirect management (read + write)  |
| `redirects_readonly`          | 2     | URL redirects read-only (list, get)          |

### Tools by Group

- **newsletter** / **newsletter_readonly**:
  - Read-only: `get_newsletter_posts`, `get_newsletter_post`, `get_authors`
  - Write: `draft_newsletter_post`, `update_newsletter_post`, `upload_image`
- **server_queue** / **server_queue_readonly**:
  - Read-only: `search_mcp_implementations`, `get_draft_mcp_implementations`, `find_providers`
  - Write: `save_mcp_implementation`, `send_impl_posted_notif`
- **official_queue** / **official_queue_readonly**:
  - Read-only: `get_official_mirror_queue_items`, `get_official_mirror_queue_item`
  - Write: `approve_official_mirror_queue_item`, `approve_mirror_no_modify`, `reject_official_mirror_queue_item`, `add_official_mirror_to_regular_queue`, `unlink_official_mirror_queue_item`
- **unofficial_mirrors** / **unofficial_mirrors_readonly**:
  - Read-only: `get_unofficial_mirrors`, `get_unofficial_mirror`
  - Write: `create_unofficial_mirror`, `update_unofficial_mirror`, `delete_unofficial_mirror`
- **official_mirrors** / **official_mirrors_readonly**:
  - Read-only: `get_official_mirrors`, `get_official_mirror`
- **tenants** / **tenants_readonly**:
  - Read-only: `get_tenants`, `get_tenant`
- **mcp_jsons** / **mcp_jsons_readonly**:
  - Read-only: `get_mcp_jsons`, `get_mcp_json`
  - Write: `create_mcp_json`, `update_mcp_json`, `delete_mcp_json`
- **mcp_servers** / **mcp_servers_readonly**:
  - Read-only: `list_mcp_servers`, `get_mcp_server`
  - Write: `update_mcp_server`
- **redirects** / **redirects_readonly**:
  - Read-only: `get_redirects`, `get_redirect`
  - Write: `create_redirect`, `update_redirect`, `delete_redirect`

## Environment Variables

| Variable      | Description                                 | Default                                                                                                                                |
| ------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `TOOL_GROUPS` | Comma-separated list of enabled tool groups | `newsletter,server_queue,official_queue,unofficial_mirrors,official_mirrors,tenants,mcp_jsons,mcp_servers,redirects` (all base groups) |

## Examples

Enable all tools with full access (default):

```bash
# No environment variables needed - all base groups enabled
```

Enable only newsletter tools:

```bash
TOOL_GROUPS=newsletter
```

Enable server_queue with read-only access:

```bash
TOOL_GROUPS=server_queue_readonly
```

Enable all groups with read-only access:

```bash
TOOL_GROUPS=newsletter_readonly,server_queue_readonly,official_queue_readonly,unofficial_mirrors_readonly,official_mirrors_readonly,tenants_readonly,mcp_jsons_readonly,mcp_servers_readonly,redirects_readonly
```

Mix full and read-only access per group:

```bash
# Full newsletter access, read-only server_queue, no official_queue
TOOL_GROUPS=newsletter,server_queue_readonly
```

# Usage Tips

- Use `get_newsletter_posts` to browse existing content before creating new posts
- When uploading images, both `post_slug` and `file_name` are required
- Draft posts allow you to prepare content without immediately publishing
- Search functionality supports finding posts by title, content, or metadata
- The update tool allows modifying all post metadata except status
- Use author slugs when creating posts (e.g., "sarah-chen", "john-doe")
- Use MCP server/client slugs for featured content (e.g., "github-mcp", "claude-desktop")
- Use `search_mcp_implementations` to discover MCP servers and clients in the PulseMCP registry
- Enable or disable specific tool groups by setting `TOOL_GROUPS` environment variable
- Use `_readonly` suffixes to restrict groups to read-only operations (e.g., `server_queue_readonly`)
- Use the `remote` array parameter in `save_mcp_implementation` to configure remote endpoints for MCP servers (transport, host_platform, authentication_method, etc.)
- Use the `canonical` array parameter in `save_mcp_implementation` to set canonical URLs with scope (domain, subdomain, subfolder, or url)
- Remote endpoints allow specifying how MCP servers can be accessed (direct URL, setup URL, authentication method, cost, etc.)
- When updating existing remotes, include the remote `id` (number from `get_draft_mcp_implementations`) in the remote object
- Use `list_mcp_servers` to browse MCP servers with filtering by status (draft/live/archived) and classification (official/community)
- Use `get_mcp_server` to get a unified view of all server data including provider, source code, canonicals, remotes, and tags
- Use `update_mcp_server` to update any admin UI field: name, description, provider, source code, package info, tags, canonicals, remotes, etc.
- The `mcp_servers` tools abstract away the MCPImplementation → MCPServer data model complexity

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
        "TOOL_GROUPS": "newsletter,server_queue,official_queue,unofficial_mirrors,official_mirrors,tenants,mcp_jsons,mcp_servers,redirects"
      }
    }
  }
}
```

For read-only access:

```json
{
  "mcpServers": {
    "pulsemcp-cms-admin-readonly": {
      "command": "node",
      "args": ["/path/to/pulsemcp-cms-admin/local/build/index.js"],
      "env": {
        "PULSEMCP_ADMIN_API_KEY": "your-api-key-here",
        "TOOL_GROUPS": "newsletter_readonly,server_queue_readonly,official_queue_readonly,unofficial_mirrors_readonly,official_mirrors_readonly,tenants_readonly,mcp_jsons_readonly,mcp_servers_readonly,redirects_readonly"
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
