# Gmail Workspace MCP Server

An MCP (Model Context Protocol) server that provides Gmail integration for AI assistants, with support for Google Workspace service accounts.

## Features

- **List Recent Emails**: Retrieve recent emails within a specified time horizon
- **Get Email Details**: Fetch full email content including body and attachments info
- **Service Account Support**: Domain-wide delegation for Google Workspace organizations

## Installation

```bash
npm install gmail-workspace-mcp-server
```

Or run directly with npx:

```bash
npx gmail-workspace-mcp-server
```

## Prerequisites

This server supports two authentication methods:

### Option 1: Service Account with Domain-Wide Delegation (Recommended)

Use a Google Cloud service account with domain-wide delegation to access Gmail on behalf of users in your Google Workspace domain.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Create a service account with domain-wide delegation enabled
5. In [Google Workspace Admin Console](https://admin.google.com/), grant the service account access to the `https://www.googleapis.com/auth/gmail.readonly` scope
6. Download the JSON key file

### Option 2: OAuth2 Access Token

Use a standard OAuth2 access token with the `gmail.readonly` scope.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Create OAuth2 credentials
5. Use the OAuth2 flow to obtain an access token

### Environment Variables

| Variable                         | Required                  | Description                           |
| -------------------------------- | ------------------------- | ------------------------------------- |
| `GMAIL_SERVICE_ACCOUNT_KEY_FILE` | Yes (for service account) | Path to service account JSON key file |
| `GMAIL_IMPERSONATE_EMAIL`        | Yes (for service account) | Email address to impersonate          |
| `GMAIL_ACCESS_TOKEN`             | Yes (for OAuth2)          | Gmail API OAuth2 access token         |

## Configuration

### Claude Desktop (Service Account)

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["gmail-workspace-mcp-server"],
      "env": {
        "GMAIL_SERVICE_ACCOUNT_KEY_FILE": "/path/to/service-account-key.json",
        "GMAIL_IMPERSONATE_EMAIL": "user@yourdomain.com"
      }
    }
  }
}
```

### Claude Desktop (OAuth2 Access Token)

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["gmail-workspace-mcp-server"],
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
