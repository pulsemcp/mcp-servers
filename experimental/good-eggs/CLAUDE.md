# CLAUDE.md

This file provides guidance to Claude Code when working with the Good Eggs MCP server.

## Overview

Good Eggs MCP Server provides tools for automating grocery shopping on Good Eggs (goodeggs.com). It uses Playwright with stealth mode to automate browser interactions and maintain a persistent session.

## Architecture

### Key Components

1. **GoodEggsClient** (`shared/src/server.ts`)
   - Manages Playwright browser instance
   - Handles login flow on initialization
   - Implements all grocery shopping methods
   - Maintains persistent browser session across tool calls

2. **Tools** (`shared/src/tools.ts`)
   - `search_for_grocery` - Search products by query
   - `get_favorites` - Get user's favorite items
   - `get_grocery_details` - Get product details
   - `add_to_cart` - Add items to cart
   - `search_for_freebie_groceries` - Find deals
   - `get_list_of_past_order_dates` - Get order history
   - `get_past_order_groceries` - Get items from past order

3. **Entry Point** (`local/src/index.ts`)
   - Validates environment variables (username/password)
   - Sets up graceful shutdown to close browser
   - Creates and starts the MCP server

### Browser Session Management

- Browser is lazily initialized on first tool use
- Login happens automatically during initialization
- Single browser session persists across all tool calls
- Tools check current page URL to avoid unnecessary navigation

## Environment Variables

| Variable             | Required | Description                            |
| -------------------- | -------- | -------------------------------------- |
| `GOOD_EGGS_USERNAME` | Yes      | Good Eggs account email                |
| `GOOD_EGGS_PASSWORD` | Yes      | Good Eggs account password             |
| `HEADLESS`           | No       | Run browser headless (default: true)   |
| `TIMEOUT`            | No       | Browser timeout in ms (default: 30000) |

## Development Commands

```bash
npm run install-all   # Install dependencies
npm run build         # Build TypeScript
npm run dev           # Development mode
npm test              # Run tests
npm run lint          # Check linting
npm run lint:fix      # Fix linting issues
```

## Good Eggs Website Structure

Key URLs used by the client:

- `/signin` - Login page
- `/search?q=<query>` - Search results
- `/favorites` - User's favorites (requires login)
- `/good-deals` - Deals and discounts page
- `/reorder` - Past orders (requires login)
- Product pages: `/<vendor>/<product-name>/<product-id>`

## DOM Selectors

The client uses flexible selectors to handle Good Eggs' React-based UI:

- Product cards: `a.js-product-link` (Good Eggs uses this class for product links)
- Product URLs: `/<producer>/<product-slug>/<product-id>` (e.g., `/cloversfbay/organic-whole-milk/53fe295358ed090200000f2d`)
- Names: `h2, h3, [class*="title"], [class*="name"]` (fallback to link text)
- Brands: `[class*="brand"], [class*="producer"]`
- Prices: `[class*="price"]`
- Add to cart: `button:has-text("ADD TO BASKET")`

## Page Navigation

Good Eggs has persistent network connections (analytics, WebSockets) that prevent Playwright's `networkidle` wait strategy from completing. All page navigations use `domcontentloaded` instead, followed by a 3-second wait for React components to render.

## Logging

Uses centralized logging to stderr (never stdout):

- `logServerStart()` - Server startup
- `logError()` - Error logging
- `logWarning()` - Warning logging

## Development Workflow

- **Changelog Updates**: Always update CHANGELOG.md when making changes
- **Testing**: Test with real credentials before submitting changes
- **DOM Changes**: Good Eggs may update their UI; selectors may need adjustment
