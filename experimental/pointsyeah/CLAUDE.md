# PointsYeah MCP Server - Implementation Notes

## Architecture Overview

This MCP server integrates with PointsYeah, a travel rewards search engine. All API calls use plain HTTP requests:

1. **Explorer Search API** (`api.pointsyeah.com/v2/live/explorer/search`) - Flight search via direct HTTP POST
2. **CloudFront Detail URLs** - Full route/segment info for each search result
3. **User APIs** (`api.pointsyeah.com/v2/live`) - History and other user data

## Key Design Decisions

### Authentication

- Uses AWS Cognito `REFRESH_TOKEN_AUTH` flow
- Tokens are refreshed lazily - only when within 5 minutes of expiry
- The refresh token itself does not rotate; the same token works until it expires
- All authenticated API calls use `withAuth()` which automatically retries on 401

### Flight Search (Two-Step)

1. **Explorer Search**: HTTP POST to `/explorer/search` with departure/arrival airports, date, cabin classes. Returns summary results with `detail_url` for each.
2. **Detail Fetch**: HTTP GET each `detail_url` (CloudFront-hosted JSON) for full route, segment, and transfer information. Up to 10 detail fetches per search.

## API Domains

- `cognito-idp.us-east-1.amazonaws.com` - Authentication
- `api.pointsyeah.com` - Explorer search, user APIs (history)
- CloudFront CDN - Flight detail JSON files

## Environment Variables

- `POINTSYEAH_REFRESH_TOKEN` (required) - Cognito refresh token (~1784 char JWE)
- `ENABLED_TOOLGROUPS` (optional) - Tool group filter

## Testing

- Functional tests mock the `IPointsYeahClient` interface
- Integration tests use `createIntegrationMockPointsYeahClient` with `TestMCPClient`
- Manual tests require a real refresh token
