# Fetch Pet MCP Server

MCP server for Fetch Pet insurance claims management using Playwright automation. Submit claims, track claim status, and view claim details including EOB and invoices.

## Features

- **Prepare Claims** - Fill out claim forms with validation (without submitting)
- **Submit Claims** - Actually submit prepared claims with explicit user confirmation
- **View Active Claims** - See all pending/processing claims
- **View Historical Claims** - See all completed/approved/denied claims
- **Claim Details** - Get detailed information including EOB and invoice downloads

## Tools

| Tool                      | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `prepare_claim_to_submit` | Prepare a claim form for submission (validates but does NOT submit) |
| `submit_claim`            | Submit a prepared claim (requires user confirmation token)          |
| `get_active_claims`       | Get list of pending/processing claims                               |
| `get_historical_claims`   | Get list of completed/approved/denied claims                        |
| `get_claim_details`       | Get detailed claim info including EOB and invoice downloads         |

## Setup

### Prerequisites

- Node.js 18+
- A Fetch Pet account (create one at [fetchpet.com](https://fetchpet.com))

### Environment Variables

| Variable                | Required | Description                        | Default                   |
| ----------------------- | -------- | ---------------------------------- | ------------------------- |
| `FETCHPET_USERNAME`     | Yes      | Your Fetch Pet account email       | -                         |
| `FETCHPET_PASSWORD`     | Yes      | Your Fetch Pet account password    | -                         |
| `HEADLESS`              | No       | Run browser in headless mode       | `true`                    |
| `TIMEOUT`               | No       | Browser operation timeout (ms)     | `30000`                   |
| `FETCHPET_DOWNLOAD_DIR` | No       | Directory to save downloaded files | `/tmp/fetchpet-downloads` |

### Claude Desktop

Make sure you have your Fetch Pet account credentials ready.

Then proceed to the setup instructions below. If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

#### Manual Setup

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "fetchpet": {
      "command": "npx",
      "args": ["-y", "fetchpet-mcp-server"],
      "env": {
        "FETCHPET_USERNAME": "your-email@example.com",
        "FETCHPET_PASSWORD": "your-password"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## Usage Examples

### Submit a new claim

```
"Submit a claim for my dog Buddy - I have an invoice from Test Vet Clinic for $150 dated January 15th for an annual checkup"
```

The assistant will:

1. Use `prepare_claim_to_submit` to fill out the form
2. Show you exactly what will be submitted
3. Ask for your explicit confirmation
4. Only then call `submit_claim` with the confirmation token

### View claims

```
"Show me my active claims"
"What claims are pending?"
"Show my claim history"
"What's the status of my recent claims?"
```

### Get claim details

```
"Get details for claim ABC123"
"Download the EOB for my last claim"
"Show me the invoice for that claim"
```

## How It Works

This MCP server uses Playwright to automate a browser session with Fetch Pet:

1. **On first tool use**: Launches a browser and logs into your Fetch Pet account
2. **Browser session persists**: All subsequent tool calls reuse the same logged-in session
3. **Smart navigation**: Tools navigate to the appropriate pages as needed
4. **Stealth mode**: Uses playwright-extra with stealth plugin to avoid bot detection

### Claim Submission Safety

The claim submission process is designed with safety in mind:

1. **`prepare_claim_to_submit`** fills out the form and validates everything but does NOT click submit
2. It returns a unique confirmation token
3. **`submit_claim`** requires this token, ensuring explicit user confirmation
4. Without the correct token, claims cannot be submitted

## Development

```bash
# Install dependencies
npm run install-all

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests (requires real credentials)
npm run test:manual

# Lint
npm run lint
```

## Project Structure

```
fetchpet/
├── local/                 # Local server implementation
│   └── src/
│       └── index.ts       # Entry point with env validation
├── shared/                # Shared business logic
│   └── src/
│       ├── server.ts      # FetchPetClient with Playwright automation
│       ├── tools.ts       # MCP tool definitions
│       ├── types.ts       # TypeScript types
│       └── logging.ts     # Logging utilities
├── tests/                 # Test suites
├── package.json           # Root workspace config
└── README.md
```

## Security Notes

- Your Fetch Pet credentials are used only to log into your account
- The browser session runs locally on your machine
- No credentials are transmitted to any third-party services
- Consider using environment variables rather than hardcoding credentials
- Downloaded documents (EOB, invoices) are saved to the configured download directory

## Limitations

- Requires a valid Fetch Pet account
- Browser automation may occasionally fail if Fetch Pet updates their website
- Some operations require navigating between pages which takes time
- The website uses a React app, so dynamic content loading may require waits

## License

MIT
