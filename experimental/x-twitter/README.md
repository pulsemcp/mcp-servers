# X (Twitter) MCP Server

An MCP (Model Context Protocol) server for X (formerly Twitter). It reads your home timeline, a user's tweet history, bookmarks, recent search results, and looks up individual tweets and users through the X API v2 using OAuth 2.0 user context. It can also add and remove your own **private** bookmarks.

## Safety: No Public Actions by Design

This server does reads plus **private bookmark writes only**. It **never** posts, replies, likes, retweets, quotes, follows, mutes, blocks, or sends DMs — it performs no public action of any kind. The only mutations it can make are adding/removing tweets in **your own private bookmark collection**, which no one else can see. This guarantee is enforced structurally, not just by convention:

- **No public-mutation tools exist.** The only write tools are `create_bookmark` and `remove_bookmark` (see below). No code path issues any non-`GET` request other than those two bookmark endpoints.
- **No public-mutation scopes are requested.** The server and its OAuth setup flow only ever request `tweet.read users.read bookmark.read bookmark.write offline.access`. `bookmark.write` is the sole write scope and grants access only to your private bookmarks; `tweet.write`, `like.write`, `follows.write`, `dm.write`, etc. are never requested, so even a compromised token could not post, like, follow, or DM.

Functional and integration tests assert the absence of any tool whose name contains a public-mutation verb (`post`, `reply`, `retweet`, `like`, `follow`, `dm`, `mute`, `block`).

## Tool Groups

Tools are organized into two groups, selectable via the `X_TWITTER_ENABLED_TOOLGROUPS` environment variable (comma-separated). When unset, **all** groups are enabled.

| Group       | Tools                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| `readonly`  | `get_my_account`, `get_user`, `get_home_timeline`, `get_user_tweets`, `get_bookmarks`, `search_recent_tweets`, `get_tweets` |
| `readwrite` | everything in `readonly` **plus** `create_bookmark`, `remove_bookmark`                                                      |

Set `X_TWITTER_ENABLED_TOOLGROUPS=readonly` to expose only the read tools (no bookmark writes). Invalid or empty values warn and fall back to all groups.

## Tools

| Tool                   | Group     | Description                                                          | X API v2 endpoint                                  |
| ---------------------- | --------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| `get_my_account`       | readonly  | The authenticated user's profile                                     | `GET /2/users/me`                                  |
| `get_user`             | readonly  | Look up a user by `@handle`                                          | `GET /2/users/by/username/:username`               |
| `get_home_timeline`    | readonly  | Reverse-chronological home timeline                                  | `GET /2/users/:id/timelines/reverse_chronological` |
| `get_user_tweets`      | readonly  | A user's own tweet history (reaches back further than recent search) | `GET /2/users/:id/tweets`                          |
| `get_bookmarks`        | readonly  | The authenticated user's bookmarks                                   | `GET /2/users/:id/bookmarks`                       |
| `search_recent_tweets` | readonly  | Search tweets from the last 7 days                                   | `GET /2/tweets/search/recent`                      |
| `get_tweets`           | readonly  | Look up one or more tweets by id (≤100)                              | `GET /2/tweets`                                    |
| `create_bookmark`      | readwrite | Add a tweet to your **private** bookmarks                            | `POST /2/users/:id/bookmarks`                      |
| `remove_bookmark`      | readwrite | Remove a tweet from your **private** bookmarks                       | `DELETE /2/users/:id/bookmarks/:tweet_id`          |

All tweet-returning tools request rich expansions and fields: author profile, `created_at`, `public_metrics`, `referenced_tweets`, and `note_tweet` (so long-form tweets are returned in full rather than truncated).

### On search reach

`search_recent_tweets` is limited to the **last 7 days** by the X API's standard recent-search endpoint. For older posts from a specific account, use `get_user_tweets`, which pages back through a user's timeline (the API exposes up to ~3,200 of their most recent tweets). Full-archive search (`GET /2/tweets/search/all`) is **not** exposed — it requires a higher, separately-gated API access level.

## Installation

```bash
npm install x-twitter-mcp-server
```

Or run directly with npx:

```bash
npx x-twitter-mcp-server
```

## Prerequisites: X API Access Tier

The endpoints this server uses (reads and bookmark writes) require a paid X API tier. As of this writing your app must be enrolled in **Pay-per-use** (or a higher tier) and set to **Production** in the [X developer portal](https://developer.x.com/en/portal/dashboard). If your app is not enrolled, the endpoints return HTTP `403` with a `client-not-enrolled` error. This server surfaces that error clearly in the tool output.

## Authentication

The server authenticates with **OAuth 2.0 Authorization Code + PKCE** using a **confidential client** (client id + client secret). It supports two modes.

### Option 1: Refresh-token mode (recommended for standalone use)

You supply a long-lived refresh token once; the server exchanges it for short-lived access tokens as needed and rotates the refresh token in memory.

Required environment variables:

| Variable                | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `X_OAUTH_CLIENT_ID`     | OAuth 2.0 client id (confidential client)                |
| `X_OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret                                  |
| `X_OAUTH_REFRESH_TOKEN` | Refresh token minted via the one-time consent flow below |

### Option 2: Static access-token mode (for centrally-managed deployments)

You inject a short-lived access token that some external process refreshes and rotates. The server uses it as-is and does **not** refresh it itself. This mirrors how other servers in this harness (e.g. Zoom, Slack) are run in CI and production, where a central refresher hands out fresh tokens.

| Variable               | Description                                            |
| ---------------------- | ------------------------------------------------------ |
| `X_OAUTH_ACCESS_TOKEN` | A valid, unexpired OAuth 2.0 user-context access token |

## Minting a Refresh Token (one-time consent)

X does not offer a non-interactive way to obtain a user-context token — a human must authorize the app in a browser once. Use the built-in setup command:

```bash
npx x-twitter-mcp-server oauth-setup <client_id> <client_secret>
```

Or pass credentials via environment variables:

```bash
X_OAUTH_CLIENT_ID=... X_OAUTH_CLIENT_SECRET=... npx x-twitter-mcp-server oauth-setup
```

The command:

1. Generates a PKCE `code_verifier`/`code_challenge` (S256). The verifier is never printed.
2. Starts a loopback HTTP server on `http://localhost:3000/callback` (override the port with `PORT=...`).
3. Prints an X consent URL requesting the scopes `tweet.read users.read bookmark.read bookmark.write offline.access` (`bookmark.write` is the only write scope — private bookmarks only).
4. Waits for you to sign in, authorize, and be redirected back with an authorization code.
5. Exchanges the code (with the PKCE verifier and HTTP Basic client auth) for tokens and prints the resulting `X_OAUTH_REFRESH_TOKEN`.

**Before running it**, register the redirect URI on your X app in the developer portal:

```
http://localhost:3000/callback
```

### ⚠️ X refresh tokens are single-use and rotate

Unlike Google, **X refresh tokens rotate on every use**: each token refresh returns a _new_ refresh token and invalidates the previous one. Refresh tokens also expire (~6 months).

Implications:

- **Refresh-token mode** keeps the rotated token in memory for the life of the process. If the process restarts, it reuses the last token you configured — which is still valid until its first successful refresh. If a refresh has already happened in a prior run, the originally-configured token is stale and you must mint a fresh one (or switch to static access-token mode with a central refresher that persists the rotation).
- For always-on deployments, **static access-token mode** with a central refresher that durably stores the rotating refresh token is the more robust choice.

## Configuration Example

```json
{
  "mcpServers": {
    "x-twitter": {
      "command": "npx",
      "args": ["-y", "x-twitter-mcp-server"],
      "env": {
        "X_OAUTH_CLIENT_ID": "your-client-id",
        "X_OAUTH_CLIENT_SECRET": "your-client-secret",
        "X_OAUTH_REFRESH_TOKEN": "your-refresh-token",
        "X_TWITTER_ENABLED_TOOLGROUPS": "readonly,readwrite"
      }
    }
  }
}
```

## Development

This server follows the internal `local/`+`shared/` workspace split. See [mcp-servers/CLAUDE.md](../../CLAUDE.md) for harness-wide conventions.

```bash
cd mcp-servers

# Build
(cd servers/x-twitter/shared && npm run build)
(cd servers/x-twitter/local && npm run build)

# Functional + integration tests (mocked X API — no network)
(cd servers/x-twitter && npx vitest run)
(cd servers/x-twitter && npx vitest run -c vitest.config.integration.ts)

# E2E tests (real X API — requires credentials)
(cd servers/x-twitter && npx vitest run -c vitest.config.e2e.ts)
```

E2E tests read credentials from `X_OAUTH_*` environment variables or a decrypted `tests/e2e/.env`, and skip gracefully when none are present.
