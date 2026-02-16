# PointsYeah MCP Server

An MCP server for searching award flights and travel deals via [PointsYeah](https://www.pointsyeah.com). Search for flight availability using points and miles across 20+ airline loyalty programs and compare transfer options from major bank reward programs.

## Features

- **Award Flight Search** - Search for flights using points/miles across multiple airline programs
- **Bank Transfer Comparisons** - See transfer options from Chase, Amex, Citi, Capital One, Bilt, and Wells Fargo
- **Flight Deal Recommendations** - Discover curated award flight deals and sweet spots
- **Hotel Deal Recommendations** - Find hotel point redemption opportunities
- **Search History** - Review your past award flight searches
- **User Profile** - View membership and preference information

## Prerequisites

- A PointsYeah account (free or premium)
- [Playwright](https://playwright.dev/) installed for flight search functionality
- Node.js 18+

## Configuration

### Environment Variables

| Variable                   | Required | Description                                          |
| -------------------------- | -------- | ---------------------------------------------------- |
| `POINTSYEAH_REFRESH_TOKEN` | Yes      | AWS Cognito refresh token from PointsYeah            |
| `ENABLED_TOOLGROUPS`       | No       | Comma-separated tool groups to enable (default: all) |

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
4. Copy the output and set it as `POINTSYEAH_REFRESH_TOKEN`

> **Note:** The refresh token typically expires after 30-90 days. You'll need to repeat this process when it expires.

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

# Install Playwright (required for flight search)
npx playwright install chromium

# Set up environment
export POINTSYEAH_REFRESH_TOKEN="your-refresh-token"

# Build and run
npm run build
cd local && npm start
```

## Available Tools

| Tool                         | Description                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `search_flights`             | Search for award flights using points/miles across multiple airline programs |
| `get_search_history`         | Get past flight search history                                               |
| `get_user_membership`        | Get user membership information                                              |
| `get_user_preferences`       | Get user preferences                                                         |
| `get_flight_recommendations` | Get flight deal recommendations from Explorer                                |
| `get_hotel_recommendations`  | Get hotel deal recommendations from Explorer                                 |
| `get_explorer_count`         | Get total count of available deals                                           |

## Architecture

This server uses a two-step approach for flight searches:

1. **Playwright** - The initial search request is encrypted client-side by PointsYeah. We use Playwright to navigate to the search page, inject authentication cookies, and intercept the search task creation response.
2. **HTTP Polling** - Once a search task is created, results are polled via plain HTTP until all airline programs have responded.

All other API calls (history, membership, recommendations, etc.) use plain HTTP requests with the Cognito ID token for authentication.

### Authentication Flow

PointsYeah uses AWS Cognito for authentication. The server:

1. Takes a Cognito refresh token from the environment
2. Exchanges it for access and ID tokens via Cognito's `InitiateAuth` API
3. Refreshes tokens lazily when they're within 5 minutes of expiry
4. Uses the ID token for all API requests

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
- **Playwright dependency** - Flight search requires Playwright with Chromium. Other tools work without it.
- **Free plan limits** - PointsYeah may limit search frequency or result count on free plans.
- **Frontend changes** - If PointsYeah changes their frontend, the Playwright-based search flow may need updating.
