# PointsYeah MCP Server - Implementation Notes

## Architecture Overview

This MCP server integrates with PointsYeah, a travel rewards search engine. The server uses two main approaches:

1. **Playwright** for flight search (because the search request body is encrypted client-side)
2. **Plain HTTP** for all other API calls (auth, polling, user data, recommendations)

## Key Design Decisions

### Authentication

- Uses AWS Cognito `REFRESH_TOKEN_AUTH` flow
- Tokens are refreshed lazily (Option B from spec) - only when within 5 minutes of expiry
- The refresh token itself does not rotate; the same token works until it expires

### Flight Search (Two-Step)

1. **Create Task (Playwright)**: Navigate to search URL with injected Cognito cookies, intercept the `create_task` API response to get a `task_id`
2. **Poll Results (HTTP)**: Poll `fetch_result` with the `task_id` every 3 seconds until all sub-tasks complete

### Playwright Abstraction

The Playwright dependency is abstracted behind interfaces (`PlaywrightSearchDeps`, `PlaywrightBrowserContext`, `PlaywrightPage`) so that:

- Tests can inject mocks without requiring Playwright
- The server can gracefully degrade when Playwright is not installed (non-search tools still work)

## API Domains

- `cognito-idp.us-east-1.amazonaws.com` - Authentication
- `api.pointsyeah.com` - User APIs (history, membership, preferences, explorer)
- `api2.pointsyeah.com` - Flight search (create task, fetch results)

## Environment Variables

- `POINTSYEAH_REFRESH_TOKEN` (required) - Cognito refresh token (~1784 char JWE)
- `ENABLED_TOOLGROUPS` (optional) - Tool group filter

## Testing

- Functional tests mock the `IPointsYeahClient` interface
- Integration tests use `createIntegrationMockPointsYeahClient` with `TestMCPClient`
- Manual tests require a real refresh token and Playwright
