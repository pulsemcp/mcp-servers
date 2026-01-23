# Gmail Workspace MCP Server

An MCP (Model Context Protocol) server that provides Gmail integration for AI assistants using Google Workspace service accounts with domain-wide delegation.

## Features

- **List Email Conversations**: Retrieve emails with label filtering
- **Get Email Details**: Fetch full email content including body and attachments info
- **Search Emails**: Search using Gmail's powerful query syntax
- **Manage Emails**: Mark as read/unread, star/unstar, archive, apply labels
- **Create Drafts**: Compose draft emails with reply support
- **Send Emails**: Send new emails or replies, directly or from drafts
- **Service Account Authentication**: Secure domain-wide delegation for Google Workspace organizations

## Installation

```bash
npm install gmail-workspace-mcp-server
```

Or run directly with npx:

```bash
npx gmail-workspace-mcp-server
```

## Prerequisites

This server requires a Google Cloud service account with domain-wide delegation to access Gmail on behalf of users in your Google Workspace domain.

### Setup Steps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Create a service account with domain-wide delegation enabled
5. In [Google Workspace Admin Console](https://admin.google.com/), grant the service account access to the following scopes:
   - `https://www.googleapis.com/auth/gmail.readonly` (read emails)
   - `https://www.googleapis.com/auth/gmail.modify` (modify labels)
   - `https://www.googleapis.com/auth/gmail.compose` (create drafts)
   - `https://www.googleapis.com/auth/gmail.send` (send emails)
6. Download the JSON key file

### Environment Variables

| Variable                             | Required | Description                                                         |
| ------------------------------------ | -------- | ------------------------------------------------------------------- |
| `GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL` | Yes      | Service account email address                                       |
| `GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY`  | Yes      | Service account private key (PEM format)                            |
| `GMAIL_IMPERSONATE_EMAIL`            | Yes      | Email address to impersonate                                        |
| `GMAIL_ENABLED_TOOLGROUPS`           | No       | Comma-separated list of tool groups to enable (default: all groups) |

You can find the `client_email` and `private_key` values in your service account JSON key file.

### Tool Groups

The server supports two tool groups for permission-based access control:

| Group       | Tools Included                                                                     |
| ----------- | ---------------------------------------------------------------------------------- |
| `readonly`  | `list_email_conversations`, `get_email_conversation`, `search_email_conversations` |
| `readwrite` | All readonly tools + `change_email_conversation`, `draft_email`, `send_email`      |

By default, all tool groups are enabled. To restrict access, set the `GMAIL_ENABLED_TOOLGROUPS` environment variable:

```bash
# Read-only access (no write/send capabilities)
GMAIL_ENABLED_TOOLGROUPS=readonly

# Full access (default)
GMAIL_ENABLED_TOOLGROUPS=readonly,readwrite
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["gmail-workspace-mcp-server"],
      "env": {
        "GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL": "my-service-account@my-project.iam.gserviceaccount.com",
        "GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----",
        "GMAIL_IMPERSONATE_EMAIL": "user@yourdomain.com"
      }
    }
  }
}
```

**Note:** For the private key, you can either:

1. Use the key directly with `\n` for newlines (as shown above)
2. Set the environment variable from a shell that preserves newlines

## Available Tools

### list_email_conversations

List email conversations from Gmail with optional filtering.

**Parameters:**

- `count` (number, optional): Number of emails to return (default: 10, max: 100)
- `labels` (string, optional): Comma-separated label IDs to filter by (default: "INBOX")
- `sort_by` (string, optional): Sort order - "recent" (newest first) or "oldest" (default: recent)

**Example:**

```json
{
  "count": 20,
  "labels": "INBOX,STARRED"
}
```

### get_email_conversation

Retrieve the full content of a specific email by its ID.

**Parameters:**

- `email_id` (string, required): The unique identifier of the email

**Example:**

```json
{
  "email_id": "18abc123def456"
}
```

### search_email_conversations

Search emails using Gmail's powerful query syntax.

**Parameters:**

- `query` (string, required): Gmail search query (e.g., "from:user@example.com", "is:unread", "subject:meeting")
- `count` (number, optional): Maximum results to return (default: 10, max: 100)

**Example:**

```json
{
  "query": "from:alice@example.com is:unread",
  "count": 20
}
```

### change_email_conversation

Modify email labels and status (read/unread, starred, archived).

**Parameters:**

- `email_id` (string, required): The email ID to modify
- `status` (string, optional): "read", "unread", or "archived"
- `is_starred` (boolean, optional): Star or unstar the email
- `add_labels` (string, optional): Comma-separated labels to add
- `remove_labels` (string, optional): Comma-separated labels to remove

**Example:**

```json
{
  "email_id": "18abc123def456",
  "status": "read",
  "is_starred": true
}
```

### draft_email

Create a draft email, optionally as a reply to an existing conversation.

**Parameters:**

- `to` (string, required): Recipient email address
- `subject` (string, required): Email subject
- `body` (string, required): Email body (plain text)
- `thread_id` (string, optional): Thread ID for replies
- `reply_to_email_id` (string, optional): Email ID to reply to (sets References/In-Reply-To headers)

**Example:**

```json
{
  "to": "recipient@example.com",
  "subject": "Meeting Follow-up",
  "body": "Thanks for the meeting today!"
}
```

### send_email

Send an email directly or from an existing draft.

**Parameters:**

- `to` (string, conditional): Recipient email (required unless sending from draft)
- `subject` (string, conditional): Email subject (required unless sending from draft)
- `body` (string, conditional): Email body (required unless sending from draft)
- `draft_id` (string, optional): Send an existing draft by ID
- `thread_id` (string, optional): Thread ID for replies
- `reply_to_email_id` (string, optional): Email ID to reply to

**Example (new email):**

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "This is a test email."
}
```

**Example (send draft):**

```json
{
  "draft_id": "r123456789"
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

# Run manual tests (requires service account credentials)
npm run test:manual
```

## License

MIT
