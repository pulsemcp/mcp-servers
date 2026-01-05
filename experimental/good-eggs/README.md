# Good Eggs MCP Server

MCP server for Good Eggs grocery shopping automation using Playwright. Search for groceries, manage favorites, add items to cart, and view past orders.

## Features

- **Search Groceries** - Search for any grocery item on Good Eggs
- **View Favorites** - Get your saved favorite items
- **Get Product Details** - View detailed information about any product
- **Add to Cart** - Add items to your shopping cart with quantity support
- **Browse Deals** - Find items on sale and freebies
- **Past Orders** - View your order history and reorder items

## Tools

| Tool                           | Description                                |
| ------------------------------ | ------------------------------------------ |
| `search_for_grocery`           | Search for groceries by keyword            |
| `get_favorites`                | Get your favorite/saved grocery items      |
| `get_grocery_details`          | Get detailed info about a specific product |
| `add_to_cart`                  | Add a product to your shopping cart        |
| `search_for_freebie_groceries` | Find deals and discounted items            |
| `get_list_of_past_order_dates` | Get dates of your past orders              |
| `get_past_order_groceries`     | Get items from a specific past order       |

## Quick Start

### Prerequisites

- Node.js 18+
- A Good Eggs account (create one at [goodeggs.com](https://www.goodeggs.com))

### Installation

```bash
npm install
npm run build
```

### Configuration

Set the following environment variables:

| Variable             | Required | Description                     | Default |
| -------------------- | -------- | ------------------------------- | ------- |
| `GOOD_EGGS_USERNAME` | Yes      | Your Good Eggs account email    | -       |
| `GOOD_EGGS_PASSWORD` | Yes      | Your Good Eggs account password | -       |
| `HEADLESS`           | No       | Run browser in headless mode    | `true`  |
| `TIMEOUT`            | No       | Browser operation timeout (ms)  | `30000` |

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "good-eggs": {
      "command": "npx",
      "args": ["-y", "good-eggs-mcp-server"],
      "env": {
        "GOOD_EGGS_USERNAME": "your-email@example.com",
        "GOOD_EGGS_PASSWORD": "your-password"
      }
    }
  }
}
```

Restart Claude Desktop to connect.

## Usage Examples

### Search for groceries

```
"Search for organic apples"
"Find gluten-free bread"
"Look for chicken breast"
```

### View and add favorites

```
"Show me my favorite items"
"What are my saved groceries?"
```

### Add items to cart

```
"Add 2 of those apples to my cart"
"Put the organic milk in my basket"
```

### Check deals

```
"What deals are available today?"
"Find any free items"
```

### Reorder from past orders

```
"Show me my past orders"
"What did I order on January 3rd?"
```

## How It Works

This MCP server uses Playwright to automate a browser session with Good Eggs:

1. **On first tool use**: Launches a browser and logs into your Good Eggs account
2. **Browser session persists**: All subsequent tool calls reuse the same logged-in session
3. **Smart navigation**: Tools check if you're already on the right page to minimize navigation
4. **Stealth mode**: Uses playwright-extra with stealth plugin to avoid bot detection

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

# Lint
npm run lint
```

## Project Structure

```
good-eggs/
├── local/                 # Local server implementation
│   └── src/
│       └── index.ts       # Entry point with env validation
├── shared/                # Shared business logic
│   └── src/
│       ├── server.ts      # GoodEggsClient with Playwright automation
│       ├── tools.ts       # MCP tool definitions
│       ├── types.ts       # TypeScript types
│       └── logging.ts     # Logging utilities
├── tests/                 # Test suites
├── package.json           # Root workspace config
└── README.md
```

## Security Notes

- Your Good Eggs credentials are used only to log into your account
- The browser session runs locally on your machine
- No credentials are transmitted to any third-party services
- Consider using environment variables rather than hardcoding credentials

## Limitations

- Requires a valid Good Eggs account with delivery service in your area
- Browser automation may occasionally fail if Good Eggs updates their website
- Some operations (favorites, past orders) require account login

## License

MIT
