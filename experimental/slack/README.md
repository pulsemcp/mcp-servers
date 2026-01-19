# Slack MCP Server

A Model Context Protocol (MCP) server for integrating with Slack workspaces. This server provides tools for reading and writing messages, managing threads, and reacting to messages in Slack.

## Features

- **List Channels** - View all accessible public and private channels
- **Read Channel** - Get channel info and recent messages
- **Read Threads** - Get full threaded conversations
- **Post Messages** - Send new messages to channels
- **Reply to Threads** - Continue threaded conversations
- **Update Messages** - Edit previously posted messages
- **React to Messages** - Add emoji reactions to messages

## Setup

### Prerequisites

- A Slack workspace with admin permissions to create apps
- A Slack Bot Token (see instructions below)

### Environment Variables

| Variable             | Required | Description                         | Default     |
| -------------------- | -------- | ----------------------------------- | ----------- |
| `SLACK_BOT_TOKEN`    | Yes      | Slack Bot User OAuth Token          | -           |
| `ENABLED_TOOLGROUPS` | No       | Comma-separated list of tool groups | All enabled |

### Getting a Bot Token

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app or select an existing one
3. Navigate to **OAuth & Permissions**
4. Add the following **Bot Token Scopes**:
   - `channels:read` - View basic channel information
   - `channels:history` - View messages in public channels
   - `groups:read` - View private channels
   - `groups:history` - View messages in private channels
   - `chat:write` - Send messages
   - `reactions:write` - Add reactions
5. Install the app to your workspace
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### Claude Desktop

Make sure you have your Slack Bot Token ready.

Then proceed to the setup instructions below. If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

#### Manual Setup

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "slack-workspace-mcp-server"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## Available Tools

### Read-Only Tools

| Tool                 | Description                           |
| -------------------- | ------------------------------------- |
| `slack_get_channels` | List all accessible channels          |
| `slack_get_channel`  | Get channel info with recent messages |
| `slack_get_thread`   | Get a thread with all replies         |

### Write Tools

| Tool                     | Description                        |
| ------------------------ | ---------------------------------- |
| `slack_post_message`     | Post a new message to a channel    |
| `slack_reply_to_thread`  | Reply to an existing thread        |
| `slack_update_message`   | Update a previously posted message |
| `slack_react_to_message` | Add an emoji reaction to a message |

## Tool Groups

You can control which tools are available using the `ENABLED_TOOLGROUPS` environment variable:

- `readonly` - Only read operations (get channels, messages, threads)
- `write` - All operations including posting and reactions

Example: `ENABLED_TOOLGROUPS=readonly` to disable all write operations.

## Development

```bash
# Install dependencies
npm run install-all

# Run in development mode
npm run dev

# Run tests
npm test                  # Functional tests
npm run test:integration  # Integration tests
npm run test:manual       # Manual tests (requires real credentials)

# Build
npm run build
```

## License

MIT
