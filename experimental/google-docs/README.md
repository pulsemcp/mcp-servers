# Google Docs Workspace MCP Server

An MCP (Model Context Protocol) server that provides Google Docs integration for AI assistants. Supports both **personal Google accounts** (via OAuth2) and **Google Workspace accounts** (via service account with domain-wide delegation).

## Features

- **Read documents**: Fetch full body or just the heading outline of a Google Doc, by document ID or shareable URL
- **Create documents**: Create new Google Docs with optional initial content
- **Edit documents**:
  - Append text to the end of a document
  - Insert text at a specific index
  - Replace all occurrences of a string
  - Apply raw `documents.batchUpdate` requests for full structural control
- **Delete documents**: Move to Drive trash by default, or permanently delete with an explicit flag
- **Export documents**: Export to Markdown, HTML, plain text, PDF, DOCX, ODT, RTF, or EPUB
- **Share documents** (gated): Grant read/comment/write access to a user, group, domain, or anyone with a link
- **Two auth methods**: OAuth2 for personal accounts, service account for Google Workspace
- **Permission gating**: Restrict tools by group via `GOOGLE_DOCS_ENABLED_TOOLGROUPS`

## Installation

```bash
npm install google-docs-workspace-mcp-server
```

Or run directly with npx:

```bash
npx google-docs-workspace-mcp-server
```

## Authentication

This server supports two authentication modes. Choose the one that matches your account type.

### Option 1: OAuth2 (Personal Google Accounts)

Use this for personal `@gmail.com` accounts or any Google account without Workspace admin access.

#### Prerequisites

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Google Docs API** and the **Google Drive API**
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
npx google-docs-workspace-mcp-server oauth-setup <client_id> <client_secret>
```

You can also pass credentials via environment variables:

```bash
GOOGLE_DOCS_OAUTH_CLIENT_ID=... GOOGLE_DOCS_OAUTH_CLIENT_SECRET=... npx google-docs-workspace-mcp-server oauth-setup
```

**Port conflict?** If port 3000 is already in use, specify a different port:

```bash
PORT=3001 npx google-docs-workspace-mcp-server oauth-setup <client_id> <client_secret>
```

Desktop app credentials automatically allow `http://localhost` redirects on any port, so no additional Google Cloud Console configuration is needed.

This will open your browser for Google sign-in and print the refresh token. You only need to do this once — the refresh token does not expire (as long as the OAuth consent screen is published).

#### Environment Variables (OAuth2)

| Variable                          | Required | Description                                        |
| --------------------------------- | -------- | -------------------------------------------------- |
| `GOOGLE_DOCS_OAUTH_CLIENT_ID`     | Yes      | OAuth2 client ID from Google Cloud Console         |
| `GOOGLE_DOCS_OAUTH_CLIENT_SECRET` | Yes      | OAuth2 client secret                               |
| `GOOGLE_DOCS_OAUTH_REFRESH_TOKEN` | Yes      | Refresh token from the setup script                |
| `GOOGLE_DOCS_ENABLED_TOOLGROUPS`  | No       | Comma-separated list of tool groups (default: all) |

#### Claude Desktop Configuration (OAuth2)

```json
{
  "mcpServers": {
    "google-docs": {
      "command": "npx",
      "args": ["google-docs-workspace-mcp-server"],
      "env": {
        "GOOGLE_DOCS_OAUTH_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_DOCS_OAUTH_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_DOCS_OAUTH_REFRESH_TOKEN": "your-refresh-token"
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
3. Enable the **Google Docs API** and the **Google Drive API**
4. Create a service account with domain-wide delegation enabled
5. In [Google Workspace Admin Console](https://admin.google.com/), grant the service account access to the following scopes:
   - `https://www.googleapis.com/auth/documents` (read and edit documents)
   - `https://www.googleapis.com/auth/drive.file` (manage Drive files this app creates or is given access to)
6. Download the JSON key file

#### Environment Variables (Service Account)

| Variable                                   | Required | Description                                                         |
| ------------------------------------------ | -------- | ------------------------------------------------------------------- |
| `GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL` | Yes      | Service account email address                                       |
| `GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY`  | Yes      | Service account private key (PEM format)                            |
| `GOOGLE_DOCS_IMPERSONATE_EMAIL`            | Yes      | Email address to impersonate                                        |
| `GOOGLE_DOCS_ENABLED_TOOLGROUPS`           | No       | Comma-separated list of tool groups to enable (default: all groups) |

You can find the `client_email` and `private_key` values in your service account JSON key file.

#### Claude Desktop Configuration (Service Account)

```json
{
  "mcpServers": {
    "google-docs": {
      "command": "npx",
      "args": ["google-docs-workspace-mcp-server"],
      "env": {
        "GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL": "my-service-account@my-project.iam.gserviceaccount.com",
        "GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----",
        "GOOGLE_DOCS_IMPERSONATE_EMAIL": "user@yourdomain.com"
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

| Group                | Tools Included                                                                                                             | Risk Level |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `readonly`           | `get_document`, `get_document_outline`, `export_document`                                                                  | Low        |
| `readwrite`          | All readonly tools + `create_document`, `update_document`, `delete_document`, `append_text`, `insert_text`, `replace_text` | Medium     |
| `readwrite_external` | All readwrite tools + `share_document`                                                                                     | High       |

By default, all tool groups are enabled. To restrict access, set the `GOOGLE_DOCS_ENABLED_TOOLGROUPS` environment variable:

```bash
# Read-only access (no writes or sharing)
GOOGLE_DOCS_ENABLED_TOOLGROUPS=readonly

# Read and write, but no sharing
GOOGLE_DOCS_ENABLED_TOOLGROUPS=readwrite

# Full access including sharing (default)
GOOGLE_DOCS_ENABLED_TOOLGROUPS=readwrite_external
```

**Security Note:** The `share_document` tool is in a separate `readwrite_external` group because it can grant access to users outside your organization, which carries higher risk than purely internal edits.

## Available Tools

All tools that take a `document_id` accept either a raw Google Docs ID (e.g., `1AbCdEf...`) or a shareable Docs URL (e.g., `https://docs.google.com/document/d/1AbCdEf.../edit`). The server extracts the ID automatically.

### get_document

Fetch a Google Doc and return its title, outline, and full body.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `format` (string, optional): `text` (default) for human-readable output, or `json` for the raw `documents.get` API resource

### get_document_outline

Return only the heading structure of a document — useful for getting your bearings on a long doc without pulling the full body.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL

### create_document

Create a new Google Doc.

**Parameters:**

- `title` (string, required): Document title
- `initial_content` (string, optional): Plain text inserted into the new document

### update_document

Apply raw `documents.batchUpdate` requests. This is the escape hatch for any Docs API operation not covered by the more focused tools (e.g., applying paragraph styles, inserting tables, manipulating named ranges).

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `requests` (array, required): Array of `documents.batchUpdate` request objects ([API reference](https://developers.google.com/docs/api/reference/rest/v1/documents/request))

**Example:**

```json
{
  "document_id": "1AbCdEf...",
  "requests": [
    {
      "insertText": {
        "location": { "index": 1 },
        "text": "Hello, world!\n"
      }
    },
    {
      "updateParagraphStyle": {
        "range": { "startIndex": 1, "endIndex": 14 },
        "paragraphStyle": { "namedStyleType": "HEADING_1" },
        "fields": "namedStyleType"
      }
    }
  ]
}
```

### append_text

Append text to the end of a document. Resolves the end-of-body index for you.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `text` (string, required): Text to append

### insert_text

Insert text at a specific index.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `index` (number, required): Insertion index (must be ≥ 1)
- `text` (string, required): Text to insert

### replace_text

Find and replace text throughout a document. Reports the number of occurrences replaced.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `find` (string, required): String to find
- `replace` (string, required): Replacement string
- `match_case` (boolean, optional): Whether matching is case-sensitive (default: `false`)

### delete_document

Move a document to Drive trash by default, or permanently delete it.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `permanent` (boolean, optional): When `true`, permanently delete instead of trashing (default: `false`)

### export_document

Export a document in a different format.

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `format` (string, required): One of `markdown`, `html`, `txt`, `pdf`, `docx`, `odt`, `rtf`, `epub`

Text formats (`markdown`, `html`, `txt`) are returned inline. Binary formats (`pdf`, `docx`, `odt`, `rtf`, `epub`) are returned base64-encoded.

### share_document

Grant access to a user, group, domain, or anyone with the link. **Gated behind the `readwrite_external` group.**

**Parameters:**

- `document_id` (string, required): Google Docs ID or URL
- `type` (string, required): One of `user`, `group`, `domain`, `anyone`
- `role` (string, required): One of `reader`, `commenter`, `writer`
- `email_address` (string, conditional): Required for `type=user` or `type=group`
- `domain` (string, conditional): Required for `type=domain`
- `send_notification_email` (boolean, optional): Whether Google sends an email notification (default: `true`)

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

This server uses a four-tier test strategy:

| Tier            | Command                    | Hits real APIs? | Credentials needed                      |
| --------------- | -------------------------- | --------------- | --------------------------------------- |
| **Functional**  | `npm test`                 | No              | None                                    |
| **Integration** | `npm run test:integration` | No              | None                                    |
| **E2E**         | `npm run test:e2e`         | Yes             | OAuth2 or service account (encrypted)   |
| **Manual**      | `npm run test:manual`      | Yes             | OAuth2 or service account (your `.env`) |

The functional and integration tests run in CI on every commit. The e2e tests run against the live Google Docs and Drive APIs using a pinned test document and a refresh token committed (encrypted) to the repo.

#### Running E2E Tests

E2e tests live in `tests/e2e/` and exercise the full MCP server against the real Google APIs. They include:

- Read-only assertions against a pinned, pre-existing test document
- A self-cleaning lifecycle test that creates → mutates → exports → shares → deletes a fresh document end-to-end
- An error-handling check for non-existent document IDs

The full suite runs **once per auth mode** — both OAuth2 (personal account) and Service Account (Workspace impersonation) are always exercised when the suite is configured. This catches auth-mode-specific bugs (token refresh vs JWT signing, impersonation, the SA-specific `subject` claim) before they reach production. The suite is fail-fast on partial credentials: if any OAuth or SA env var is set, all required vars must be set — otherwise the suite throws at module load. The only valid "no creds" state is fork PRs where `MCP_SERVERS_MASTER_KEY` is unavailable, in which case the entire suite skips.

Credentials are stored encrypted in `tests/e2e/.env.enc` and decrypted at runtime using the `MCP_SERVERS_MASTER_KEY` shared by the entire `mcp-servers/` workspace.

**To run e2e tests locally:**

```bash
# 1. Decrypt the e2e credentials (one-time per checkout)
cd mcp-servers
MCP_SERVERS_MASTER_KEY="<key>" ./scripts/decrypt-credentials.sh google-docs

# 2. Run the suite (this also rebuilds the server and the test client)
cd servers/google-docs
npm run test:e2e
```

The master key is in 1Password under "MCP Servers Master Key" — ask a teammate with access if you don't have it. The decrypted `.env` is gitignored; only `.env.enc` is committed.

If `tests/e2e/.env` is missing or the credentials are invalid, the suite gracefully skips itself rather than failing — so CI on forks (where the master key isn't available) won't break.

For details on the pinned test document, OAuth scopes, token rotation, the SA provisioning steps, and the full list of tools exercised, see [`tests/e2e/STATE.md`](./tests/e2e/STATE.md).

#### Updating E2E Credentials

If the refresh token gets revoked, expires, or the OAuth client changes, mint a new refresh token and re-encrypt:

```bash
# 1. Mint a new refresh token via the OAuth flow (see tests/e2e/STATE.md for the full procedure)
# 2. Update tests/e2e/.env with the new GOOGLE_DOCS_OAUTH_REFRESH_TOKEN
# 3. Re-encrypt
cd mcp-servers
MCP_SERVERS_MASTER_KEY="<key>" ./scripts/encrypt-credentials.sh google-docs
# 4. Commit the updated .env.enc
git add servers/google-docs/tests/e2e/.env.enc
```

## License

MIT
