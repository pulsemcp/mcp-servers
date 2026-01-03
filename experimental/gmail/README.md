# Gmail MCP Server

An MCP (Model Context Protocol) server that provides Gmail integration for AI assistants.

## Features

- **List Recent Emails**: Retrieve recent emails within a specified time horizon
- **Get Email Details**: Fetch full email content including body and attachments info

## Installation

```bash
npm install gmail-mcp-server
```

Or run directly with npx:

```bash
npx gmail-mcp-server
```

## Prerequisites

### Gmail API Access Token

This server requires a Gmail API OAuth2 access token with the `gmail.readonly` scope.

To obtain an access token:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Create OAuth2 credentials
5. Use the OAuth2 flow to obtain an access token

### Environment Variables

| Variable             | Required | Description                   |
| -------------------- | -------- | ----------------------------- |
| `GMAIL_ACCESS_TOKEN` | Yes      | Gmail API OAuth2 access token |

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["gmail-mcp-server"],
      "env": {
        "GMAIL_ACCESS_TOKEN": "your-access-token-here"
      }
    }
  }
}
```

## Available Tools

### gmail_list_recent_emails

List recent emails from Gmail within a specified time horizon.

**Parameters:**

- `hours` (number, optional): Time horizon in hours (default: 24)
- `labels` (string, optional): Comma-separated label IDs (default: "INBOX")
- `max_results` (number, optional): Maximum emails to return (default: 10, max: 100)

**Example:**

```json
{
  "hours": 48,
  "labels": "INBOX,STARRED",
  "max_results": 20
}
```

### gmail_get_email

Retrieve the full content of a specific email by its ID.

**Parameters:**

- `email_id` (string, required): The unique identifier of the email

**Example:**

```json
{
  "email_id": "18abc123def456"
}
```

## Development

### Setup

```bash
# Install dependencies
npm run install-all

# Build
npm run build

# Run in development mode
npm run dev
```

### Testing

```bash
# Run functional tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests (requires GMAIL_ACCESS_TOKEN)
npm run test:manual
```

## License

MIT
