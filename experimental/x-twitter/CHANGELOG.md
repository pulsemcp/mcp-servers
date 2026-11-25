# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- Renamed the published npm package to the PulseMCP-branded **`pulsemcp-x-twitter-mcp-server`** (mirrors the existing `pulsemcp-cms-admin-mcp-server` unscoped-name convention). The previously-declared name `x-twitter-mcp-server` is owned by an unrelated third party on npm (a package that exposes public-posting tools), and this server was never published under it. The distinct `pulsemcp-`-prefixed name resolves to this reads-plus-private-bookmarks-only server and is not a name any third party has taken. `mcpName` / server identifier `com.pulsemcp/x-twitter` is unchanged. See issue #4659.

## [0.0.1] - 2026-07-05

### Added

- Initial release of the X (Twitter) MCP server. Published to npm as `pulsemcp-x-twitter-mcp-server`.
- Seven read tools backed by the X API v2: `get_my_account`, `get_user`, `get_home_timeline`, `get_user_tweets`, `get_bookmarks`, `search_recent_tweets`, and `get_tweets`. `get_user_tweets` pages back through a user's timeline (up to ~3,200 tweets), reaching further than the 7-day recent-search window.
- Two private-bookmark write tools: `create_bookmark` and `remove_bookmark`. These mutate only the authenticated user's private bookmark collection — the server performs no public actions (no posting, replying, liking, retweeting, following, or DMing).
- `readonly` / `readwrite` tool groups selectable via the `X_TWITTER_ENABLED_TOOLGROUPS` environment variable (defaults to all groups). The bookmark writes live in the `readwrite` group.
- OAuth 2.0 user-context auth with two modes: refresh-token mode (in-memory single-use token rotation) and static access-token mode (for centrally-refreshed deployments).
- `oauth-setup` CLI subcommand that mints a refresh token via a one-time Authorization Code + PKCE browser consent flow, requesting scopes `tweet.read users.read bookmark.read bookmark.write offline.access` (`bookmark.write` is the only write scope — private bookmarks only).
- Functional, integration, and e2e test suites. The functional and integration suites assert that no public-mutation tool is ever exposed.
