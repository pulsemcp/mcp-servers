# PointsYeah MCP Server

An MCP server for searching award flights and travel deals via [PointsYeah](https://www.pointsyeah.com). Search for flight availability using points and miles across 20+ airline loyalty programs and compare transfer options from major bank reward programs.

## Features

- **Award Flight Search** - Search for flights using points/miles across multiple airline programs
- **Bank Transfer Comparisons** - See transfer options from Chase, Amex, Citi, Capital One, Bilt, and Wells Fargo
- **Search History** - Review your past award flight searches

## Prerequisites

- A PointsYeah account (free or premium)
- Node.js 18+

## Configuration

### Environment Variables

| Variable                   | Required | Description                                                                                               |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `POINTSYEAH_REFRESH_TOKEN` | No       | AWS Cognito refresh token from PointsYeah (optional — can be set at runtime via `set_refresh_token` tool) |
| `ENABLED_TOOLGROUPS`       | No       | Comma-separated tool groups to enable (default: all)                                                      |

### Authentication

All three tools are always visible to the MCP client. Auth-requiring tools (`search_flights`, `get_search_history`) return a clear error directing users to `set_refresh_token` when not authenticated.

1. **Without a token**: Calling `search_flights` or `get_search_history` returns an error: "Authentication required. Please call the set_refresh_token tool first."
2. **After providing a valid token** (via environment variable or the tool): Flight search tools work normally
3. **If the token expires or is revoked**: Auth-requiring tools start returning errors again, prompting the user to call `set_refresh_token`

### Obtaining the Refresh Token

1. Go to [PointsYeah Sign In](https://www.pointsyeah.com/landing?route=signIn) and log in
2. Open browser DevTools (F12) -> Console
3. Run:
   ```js
   document.cookie
     .split('; ')
     .find((c) => c.includes('.refreshToken='))
     .split('=')
     .slice(1)
     .join('=');
   ```
4. Either set it as the `POINTSYEAH_REFRESH_TOKEN` environment variable, or provide it at runtime via the `set_refresh_token` tool

> **Note:** The refresh token typically expires after 30-90 days. When it expires, the server will switch back to the `set_refresh_token` tool automatically.

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "pointsyeah": {
      "command": "npx",
      "args": ["-y", "pointsyeah-mcp-server"],
      "env": {
        "POINTSYEAH_REFRESH_TOKEN": "your-refresh-token-here"
      }
    }
  }
}
```

### Manual Setup

```bash
# Clone the repository
git clone https://github.com/pulsemcp/mcp-servers.git
cd mcp-servers/experimental/pointsyeah

# Install dependencies
npm run install-all

# Set up environment
export POINTSYEAH_REFRESH_TOKEN="your-refresh-token"

# Build and run
npm run build
cd local && npm start
```

## Available Tools

| Tool                 | Description                                                                  | Requires Auth |
| -------------------- | ---------------------------------------------------------------------------- | ------------- |
| `set_refresh_token`  | Set the PointsYeah refresh token for authentication                          | No            |
| `search_flights`     | Search for award flights using points/miles across multiple airline programs | Yes           |
| `get_search_history` | Get past flight search history                                               | Yes           |

## Architecture

This server uses a two-step approach for flight searches:

1. **Explorer Search** - HTTP POST to PointsYeah's explorer API with departure/arrival airports, date, and cabin classes. Returns summary results with CloudFront detail URLs.
2. **Detail Fetch** - HTTP GET each detail URL to retrieve full route, segment, and transfer information. Up to 10 detail fetches per search.

All API calls use plain HTTP requests with the Cognito ID token for authentication.

### Authentication Flow

PointsYeah uses AWS Cognito for authentication. The server supports dynamic authentication:

1. On startup, if `POINTSYEAH_REFRESH_TOKEN` is set, validates it via Cognito. If valid, enters authenticated mode. If invalid/expired, enters unauthenticated mode.
2. All tools are always registered. Auth-requiring tools check authentication state at call time and return errors when not authenticated.
3. Once authenticated (via env var or `set_refresh_token`), exchanges the refresh token for access and ID tokens via Cognito's `InitiateAuth` API.
4. Refreshes tokens lazily when they're within 5 minutes of expiry.
5. If a token is revoked mid-session (detected via API error), automatically marks auth state as invalid so subsequent calls prompt re-authentication.

## Development

```bash
# Install dependencies
npm run install-all

# Build
npm run build

# Run tests
npm test                    # Functional tests
npm run test:integration    # Integration tests (with TestMCPClient)
npm run test:all            # All tests

# Development mode
npm run dev

# Linting (from repo root)
cd ../.. && npm run lint
cd ../.. && npm run format
```

## Limitations

- **Refresh token expiry** - The Cognito refresh token expires (typically 30-90 days). Users need to re-login and update the token.
- **Free plan limits** - PointsYeah may limit search frequency or result count on free plans.
- **API changes** - If PointsYeah changes their explorer API, the search flow may need updating.
