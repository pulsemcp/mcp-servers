# Gmail Workspace MCP Server

An MCP (Model Context Protocol) server that provides Gmail integration for AI assistants. Supports both **personal Gmail accounts** (via OAuth2) and **Google Workspace accounts** (via service account with domain-wide delegation).

## Features

- **List Email Conversations**: Retrieve emails with label filtering
- **Get Email Details**: Fetch full email content including body and attachments info
- **Search Emails**: Search using Gmail's powerful query syntax
- **Manage Emails**: Mark as read/unread, star/unstar, archive, apply labels
- **Create Drafts**: Compose draft emails with reply support
- **Send Emails**: Send new emails or replies, directly or from drafts
- **Two Auth Methods**: OAuth2 for personal accounts, Service Account for Google Workspace

## Installation

```bash
npm install gmail-workspace-mcp-server
```

Or run directly with npx:

```bash
npx gmail-workspace-mcp-server
```

## Authentication

This server supports two authentication modes. Choose the one that matches your account type.

### Option 1: OAuth2 (Personal Gmail Accounts)

Use this for personal `@gmail.com` accounts or any Google account without Workspace admin access.

#### Prerequisites

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the Gmail API
4. Configure the OAuth consent screen:
   - Choose **External** user type
   - Add yourself as a test user
   - **Publish the app** (click "Publish" on the consent screen) to prevent refresh tokens from expiring every 7 days. No full Google verification is needed for personal use.
5. Create OAuth 2.0 credentials:
   - Choose **Desktop app** as the application type
   - **Important**: Create new credentials _after_ publishing the app
6. Copy the Client ID and Client Secret

#### Getting a Refresh Token

Run the built-in setup command:

```bash
npx gmail-workspace-mcp-server oauth-setup <client_id> <client_secret>
```

You can also pass credentials via environment variables:

```bash
GMAIL_OAUTH_CLIENT_ID=... GMAIL_OAUTH_CLIENT_SECRET=... npx gmail-workspace-mcp-server oauth-setup
```

**Port conflict?** If port 3000 is already in use, specify a different port:

```bash
PORT=3001 npx gmail-workspace-mcp-server oauth-setup <client_id> <client_secret>
```

Desktop app credentials automatically allow `http://localhost` redirects on any port, so no additional Google Cloud Console configuration is needed.

This will open your browser for Google sign-in and print the refresh token. You only need to do this once — the refresh token does not expire (as long as the OAuth consent screen is published).

#### Environment Variables (OAuth2)

| Variable                    | Required | Description                                        |
| --------------------------- | -------- | -------------------------------------------------- |
| `GMAIL_OAUTH_CLIENT_ID`     | Yes      | OAuth2 client ID from Google Cloud Console         |
| `GMAIL_OAUTH_CLIENT_SECRET` | Yes      | OAuth2 client secret                               |
| `GMAIL_OAUTH_REFRESH_TOKEN` | Yes      | Refresh token from the setup script                |
| `GMAIL_ENABLED_TOOLGROUPS`  | No       | Comma-separated list of tool groups (default: all) |

#### Claude Desktop Configuration (OAuth2)

```json
{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["gmail-workspace-mcp-server"],
      "env": {
        "GMAIL_OAUTH_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GMAIL_OAUTH_CLIENT_SECRET": "your-client-secret",
        "GMAIL_OAUTH_REFRESH_TOKEN": "your-refresh-token"
      }
    }
  }
}
```

### Option 2: Service Account (Google Workspace)

Use this for Google Workspace organizations where a domain admin can grant domain-wide delegation.

#### Prerequisites

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

#### Environment Variables (Service Account)

| Variable                             | Required | Description                                                         |
| ------------------------------------ | -------- | ------------------------------------------------------------------- |
| `GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL` | Yes      | Service account email address                                       |
| `GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY`  | Yes      | Service account private key (PEM format)                            |
| `GMAIL_IMPERSONATE_EMAIL`            | Yes      | Email address to impersonate                                        |
| `GMAIL_ENABLED_TOOLGROUPS`           | No       | Comma-separated list of tool groups to enable (default: all groups) |

You can find the `client_email` and `private_key` values in your service account JSON key file.

#### Claude Desktop Configuration (Service Account)

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

## Tool Groups

The server supports three tool groups for permission-based access control:

| Group                | Tools Included                                                                     | Risk Level |
| -------------------- | ---------------------------------------------------------------------------------- | ---------- |
| `readonly`           | `list_email_conversations`, `get_email_conversation`, `search_email_conversations` | Low        |
| `readwrite`          | All readonly tools + `change_email_conversation`, `draft_email`                    | Medium     |
| `readwrite_external` | All readwrite tools + `send_email`                                                 | High       |

By default, all tool groups are enabled. To restrict access, set the `GMAIL_ENABLED_TOOLGROUPS` environment variable:

```bash
# Read-only access (no write/send capabilities)
GMAIL_ENABLED_TOOLGROUPS=readonly

# Read and write, but no external sending
GMAIL_ENABLED_TOOLGROUPS=readwrite

# Full access including sending emails (default)
GMAIL_ENABLED_TOOLGROUPS=readwrite_external
```

**Security Note:** The `send_email` tool is in a separate `readwrite_external` group because it can send emails externally, which carries higher risk than internal operations like modifying labels or creating drafts.

## Available Tools

### list_email_conversations

List email conversations from Gmail with optional filtering.

**Parameters:**

- `count` (number, optional): Number of emails to return (default: 10, max: 100)
- `labels` (string, optional): Comma-separated label IDs to filter by (default: "INBOX")
- `sort_by` (string, optional): Sort order - "recent" (newest first) or "oldest" (default: recent)
- `after` (string, optional): Only return emails after this datetime, exclusive (ISO 8601 UTC, e.g., "2024-01-15T14:30:00Z")
- `before` (string, optional): Only return emails before this datetime, exclusive (ISO 8601 UTC, e.g., "2024-01-15T14:30:00Z")

**Example:**

```json
{
  "count": 20,
  "labels": "INBOX,STARRED",
  "after": "2024-01-15T00:00:00Z",
  "before": "2024-01-20T23:59:59Z"
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
- `labels` (string, optional): Comma-separated labels to add
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
- `from_draft_id` (string, optional): Send an existing draft by ID
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
  "from_draft_id": "r123456789"
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

# Run manual tests (requires credentials)
npm run test:manual
```

## License

MIT
