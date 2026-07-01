# Monarch Money MCP Server

MCP server for [Monarch Money](https://www.monarchmoney.com/) — a personal finance app that aggregates accounts, transactions, budgets, and net worth across institutions. This server gives an AI assistant read and write access to the same data the Monarch web/mobile app shows you, scoped to your own account.

## Highlights

- **22 consolidated tools** across two groups (`readonly`, `manage`) covering accounts, balances, net worth, cashflow, transactions, categories, tags, transaction rules, and budgets
- **Encrypted on-disk session** at `~/.monarch-money-mcp/session.enc` — the server never accepts a Monarch password through a tool input
- **Tool group filtering** via env vars — run the server in a strict read-only mode, or hand-pick the exact tools you want exposed to the agent
- **Custom thin GraphQL transport** targeting `api.monarch.com/graphql` — no third-party Monarch client dependency

## Why a custom GraphQL client?

The tools in this server span accounts, transactions, budgets, rules, categories, and net worth. We evaluated existing TypeScript Monarch clients and didn't find one that covered the surface we needed and was actively maintained. Rather than wrap a partial third-party client and patch around its gaps, this server ships a small in-house transport (`shared/src/monarch-client/graphql-transport.ts`) that is deliberately minimal: build the request, surface auth/network errors with typed exceptions, return the typed `data` payload. Operations live as named GraphQL strings in `shared/src/monarch-client/operations.ts` so the surface is grep-able and easy to extend.

## Authentication

Monarch's `/auth/login/` endpoint gates first-time logins from an unfamiliar device behind an **email OTP** Monarch sends to your inbox, plus per-IP throttling and a Cloudflare bot challenge. That makes a fully unattended email + password flow impossible on a fresh install — the user has to read the code from email at least once. After that one-time pairing, the same install can log in with credentials alone.

Because of that, the recommended path is to **paste a session token** rather than ship credentials in the env. The server supports four ways to authenticate, in priority order:

### 1. Env-var session token (recommended)

Paste a token once into the launcher's environment. Headless, autonomous, no OTP gate.

```bash
MONARCH_SESSION_TOKEN=<your-token>
```

Where to get a token:

- Run `npm run login` (option 3) once and copy it out of `~/.monarch-money-mcp/session.enc` (after decrypting), OR
- Open the Monarch web app DevTools → Network → any `/graphql` request → copy the value of the `Authorization: Token <…>` header.

The token is resolved at startup, validated, and persisted to disk so the env var becomes optional after the first run.

### 2. Tool-based token paste

If you can't set env vars (e.g., a UI that doesn't expose the launcher's env), call the `monarch_login_with_token` tool with the token as input. The server validates it via Monarch's `me` endpoint before saving.

### 3. Env-var email + password (best-effort)

Set credentials in the env and let the server log in:

```bash
MONARCH_EMAIL=<email>
MONARCH_PASSWORD=<password>
MONARCH_TOTP=<code>          # only if your account has 2FA enabled
MONARCH_EMAIL_OTP=<code>     # only on the first launch from a new install
```

On the **first** launch from a fresh install Monarch sends an OTP to your email. The server logs a clear stderr message explaining what to do; set `MONARCH_EMAIL_OTP=<code>` and restart. Subsequent launches reuse the persisted `device-uuid` and skip the OTP gate.

### 4. Interactive CLI

```bash
cd servers/monarch-money/local
npm run login
```

Prompts for email, password, optional TOTP, and (if challenged) the email OTP. Writes the encrypted token to `~/.monarch-money-mcp/session.enc`.

### Session encryption

The token is encrypted at rest with **AES-256-GCM**. The encryption key is derived via `scrypt` from a passphrase:

- If `MONARCH_SESSION_PASSPHRASE` is set, that's the passphrase.
- Otherwise, the passphrase is derived from the machine's hostname (`os.hostname()`) and the current user (`os.userInfo().username`) — making the encrypted file machine-bound by default.

This isn't a defense against a local attacker who already controls your shell, but it does prevent accidental cross-host disclosure (e.g., the file ending up in a backup that gets restored on another machine).

## Tool Groups

Tools are tagged with one or more groups. The default exposes everything; setting `MONARCH_ENABLED_TOOL_GROUPS` (or `MONARCH_ENABLED_TOOLS` / `MONARCH_DISABLED_TOOLS`) narrows the surface.

| Group      | Includes                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `readonly` | Lookups only — accounts, transactions, balances, net worth, categories, budgets, rules.                              |
| `manage`   | Everything in `readonly` plus mutations — create/update/delete transactions, tags, rules, budgets; refresh accounts. |

Filter precedence: `MONARCH_ENABLED_TOOLS` (whitelist, exact names) > `MONARCH_ENABLED_TOOL_GROUPS` (group filter) > `MONARCH_DISABLED_TOOLS` (blacklist, exact names).

```bash
# Strict read-only deployment
MONARCH_ENABLED_TOOL_GROUPS=readonly

# Deny one specific tool
MONARCH_DISABLED_TOOLS=delete_transaction

# Whitelist exactly two tools
MONARCH_ENABLED_TOOLS=get_transactions,get_accounts
```

## Tools

### Authentication / session

| Tool                       | Groups               | Description                                                                                                  |
| -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `check_authentication`     | `readonly`, `manage` | Verify the on-disk session is valid (calls Monarch's `me`); returns setup instructions if not authenticated. |
| `monarch_login_with_token` | `manage`             | Persist a pre-obtained session token to encrypted disk storage.                                              |

### Accounts

| Tool                          | Groups               | Description                                                                                                                          |
| ----------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `get_accounts`                | `readonly`, `manage` | List every connected account with balances and metadata. Pass `includeHoldings: true` to attach investment holdings to each account. |
| `get_account_balance_history` | `readonly`, `manage` | Daily balance snapshots for one account over a date range.                                                                           |
| `refresh_accounts`            | `manage`             | Trigger an upstream institution sync.                                                                                                |

### Net worth

| Tool            | Groups               | Description                                                                                                                       |
| --------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `get_net_worth` | `readonly`, `manage` | Net worth view. `view: "history"` (default) returns a time series; `view: "by_type"` returns a current breakdown by account type. |

### Transactions (read)

| Tool                      | Groups               | Description                                                                                                                                                                                                                       |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_transactions`        | `readonly`, `manage` | Query transactions in five shapes via `view`: `list` (default, paged with filters), `summary` (aggregate totals), `cashflow` (income/expense/savings), `by_category` (totals per category), `recurring` (forecasted occurrences). |
| `get_transaction_details` | `readonly`, `manage` | Full detail for a single transaction, including its splits.                                                                                                                                                                       |

### Transactions (write)

| Tool                 | Groups   | Description                                                                                                                                                                                                                                          |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create_transaction` | `manage` | Create a manual transaction.                                                                                                                                                                                                                         |
| `update_transaction` | `manage` | Patch a transaction. Supports `amount` / `date` / `merchantId` / `categoryId` / `notes` / `hideFromReports` / `reviewed` / `tagIds` in any combination. Pass `bulkTransactionIds` + `categoryId` to bulk-recategorize many transactions in one call. |
| `delete_transaction` | `manage` | Permanently delete a transaction.                                                                                                                                                                                                                    |
| `split_transaction`  | `manage` | Split a transaction into multiple categorized parts.                                                                                                                                                                                                 |

### Categories & tags

| Tool             | Groups               | Description                                                                                   |
| ---------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| `get_categories` | `readonly`, `manage` | List all categories. Pass `includeGroups: true` to also return the top-level category groups. |
| `get_tags`       | `readonly`, `manage` | List all tags.                                                                                |
| `create_tag`     | `manage`             | Create a tag. Requires `name` and a hex `color` (e.g. `#19d2a5`); `order` is server-assigned. |
| `delete_tag`     | `manage`             | Delete a tag by `id`. Returns `{ deleted, errors }`; `deleted` is confirmed by re-reading.    |

### Transaction rules (auto-classification)

| Tool                      | Groups               | Description                                                                                                                                             |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_transaction_rules`   | `readonly`, `manage` | List configured auto-classify rules, including each rule's criteria and actions.                                                                        |
| `create_transaction_rule` | `manage`             | Create a rule from one or more criteria (merchant / amount / category / account) plus one or more match actions.                                        |
| `update_transaction_rule` | `manage`             | Update a rule by `id`. **Full replace** — re-supply the rule's complete criteria and actions (≥1 of each); any field you omit is cleared from the rule. |
| `delete_transaction_rule` | `manage`             | Permanently delete a rule by `id`.                                                                                                                      |

### Budgets

| Tool                | Groups               | Description                           |
| ------------------- | -------------------- | ------------------------------------- |
| `get_budgets`       | `readonly`, `manage` | List configured budgets.              |
| `set_budget_amount` | `manage`             | Set the budget amount for a category. |

## Quick Start

### Install

```bash
npx monarch-money-mcp-server
```

### Authenticate

```bash
# Clone the repo, cd into this server, then:
cd local
npm run login
# Prompts for email, password, TOTP — writes encrypted token to ~/.monarch-money-mcp/session.enc
```

### Claude Desktop configuration

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "monarch-money": {
      "command": "npx",
      "args": ["-y", "monarch-money-mcp-server"]
    }
  }
}
```

Restart Claude Desktop and you should be ready. The server reads the encrypted session file from disk — no env vars are required for normal use.

## Environment Variables

| Variable                      | Required | Description                                                                                            | Default                           |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `MONARCH_SESSION_TOKEN`       | No       | Pre-obtained session token; resolved at startup and persisted to disk on first run.                    | (none)                            |
| `MONARCH_EMAIL`               | No       | Email address for env-var login (paired with `MONARCH_PASSWORD`).                                      | (none)                            |
| `MONARCH_PASSWORD`            | No       | Password for env-var login.                                                                            | (none)                            |
| `MONARCH_TOTP`                | No       | TOTP code (only if 2FA is enabled).                                                                    | (none)                            |
| `MONARCH_EMAIL_OTP`           | No       | Email OTP code (only on first login from a new install).                                               | (none)                            |
| `MONARCH_SESSION_PASSPHRASE`  | No       | Override the encryption passphrase used for the on-disk session file.                                  | `monarch-mcp:${HOSTNAME}:${USER}` |
| `MONARCH_STATE_DIR`           | No       | Override the directory where `session.enc` lives.                                                      | `~/.monarch-money-mcp`            |
| `MONARCH_ENABLED_TOOL_GROUPS` | No       | Comma-separated list of groups to expose (`readonly`, `manage`). Defaults to all groups.               | (all)                             |
| `MONARCH_ENABLED_TOOLS`       | No       | Comma-separated whitelist of tool names. When set, takes precedence over groups and the disabled list. | (none)                            |
| `MONARCH_DISABLED_TOOLS`      | No       | Comma-separated blacklist of tool names. Removes specific tools after group filtering is applied.      | (none)                            |

## Security Considerations

- **No password through MCP tools.** Authentication happens via the CLI login script or env vars, never through a tool input. Tool inputs may end up in transcripts and prompt caches; passwords don't belong there.
- **Session file is encrypted at rest** with AES-256-GCM. The default passphrase (host + user) ties the file to the machine that wrote it.
- **Tool group filtering is the primary write-protection mechanism.** Set `MONARCH_ENABLED_TOOL_GROUPS=readonly` for a strict read-only deployment.
- **Read tools are not gated.** Reading account/transaction data is unrestricted once the session is unlocked. If you need read-side approval, run the server behind a client that wraps tool calls in its own confirmation flow.

## Development

### Project Structure

```
monarch-money/
├── local/                   # Stdio entry point
│   └── src/
│       ├── index.ts                       # Production entry
│       └── index.integration-with-mock.ts # Integration test entry
├── shared/                  # Business logic
│   └── src/
│       ├── server.ts        # MCP server factory
│       ├── tools.ts         # Tool registration glue + group filtering
│       ├── tools/           # One file per tool group
│       ├── monarch-client/  # GraphQL transport + session store
│       └── types.ts
├── scripts/
│   └── login.ts             # Email/password/TOTP CLI flow
└── tests/
    ├── functional/          # Unit tests with mocked client
    ├── integration/         # Full MCP protocol with mocked Monarch
    └── e2e/                 # Hits the real Monarch GraphQL API
```

### Running Tests

```bash
# From this directory:
npm test                  # Functional tests
npm run test:integration  # Integration tests (builds first)
npm run test:e2e          # E2E tests (requires MONARCH_SESSION_TOKEN)
```

## License

MIT
