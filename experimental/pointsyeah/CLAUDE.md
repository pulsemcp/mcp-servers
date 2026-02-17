# PointsYeah MCP Server - Implementation Notes

## Architecture Overview

This MCP server integrates with PointsYeah, a travel rewards search engine. All API calls use plain HTTP requests:

1. **Explorer Search API** (`api.pointsyeah.com/v2/live/explorer/search`) - Flight search via direct HTTP POST
2. **CloudFront Detail URLs** - Full route/segment info for each search result
3. **User APIs** (`api.pointsyeah.com/v2/live`) - History and other user data

## Key Design Decisions

### Static Tool Registration

- All tools (`set_refresh_token`, `search_flights`, `get_search_history`) are always registered at startup
- Auth-requiring tools check `getServerState().authenticated` at call time
- When not authenticated, auth-requiring tools return: "Authentication required. Please call the set_refresh_token tool first."
- This approach works with all MCP clients, including those that don't support `tools/list_changed` notifications (like Claude Code SDK)
- Auth state is tracked in `state.ts` (module-level singleton)

### Authentication

- Uses AWS Cognito `REFRESH_TOKEN_AUTH` flow
- Tokens are refreshed lazily - only when within 5 minutes of expiry
- The refresh token itself does not rotate; the same token works until it expires
- All authenticated API calls use `withAuth()` which automatically retries on 401
- Token revocation is detected by checking error messages for known patterns

### Flight Search (Two-Step)

1. **Explorer Search**: HTTP POST to `/explorer/search` with departure/arrival airports, date, cabin classes. Returns summary results with `detail_url` for each.
2. **Detail Fetch**: HTTP GET each `detail_url` (CloudFront-hosted JSON) for full route, segment, and transfer information. Up to 10 detail fetches per search.

## API Domains

- `cognito-idp.us-east-1.amazonaws.com` - Authentication
- `api.pointsyeah.com` - Explorer search, user APIs (history)
- CloudFront CDN - Flight detail JSON files

## Environment Variables

- `POINTSYEAH_REFRESH_TOKEN` (optional) - Cognito refresh token (~1784 char JWE). If not set, server starts in unauthenticated mode.
- `ENABLED_TOOLGROUPS` (optional) - Tool group filter

## Key Files

- `shared/src/state.ts` - Auth state management (authenticated flag, refresh token)
- `shared/src/tools.ts` - Static tool registration with auth check wrappers
- `shared/src/tools/set-refresh-token.ts` - The `set_refresh_token` tool with token validation
- `shared/src/server.ts` - `PointsYeahClient` reads token from state via getter
- `local/src/index.ts` - Entry point with optional env token validation on startup

## Testing

- Functional tests mock the `IPointsYeahClient` interface and test auth state transitions
- Integration tests use `createIntegrationMockPointsYeahClient` with `TestMCPClient`
- Manual tests are designed to always pass regardless of token availability:
  - Unauthenticated tests verify the auth-needed UX (no token required)
  - Authenticated tests gracefully handle expired/revoked tokens
