# Fetch Pet MCP Server Development Guide

This document provides development guidance for the Fetch Pet MCP Server.

## Overview

This MCP server provides Playwright-based browser automation for Fetch Pet Insurance claims management. It follows the same architecture as the Good Eggs MCP server.

## Architecture

### Core Components

1. **FetchPetClient** (`shared/src/server.ts`)
   - Main browser automation client using Playwright
   - Handles login, navigation, and DOM interactions
   - Uses playwright-extra with stealth plugin for bot detection avoidance

2. **Tools** (`shared/src/tools.ts`)
   - Defines MCP tools and their handlers
   - Each tool validates input, calls the client, and formats output

3. **Types** (`shared/src/types.ts`)
   - TypeScript interfaces for data structures
   - Zod schemas for input validation

### Key Patterns

- **Lazy Browser Initialization**: Browser launches on first tool use
- **Persistent Session**: Single browser/context/page across all tool calls
- **Confirmation Token Pattern**: For submit_claim to require explicit user confirmation
- **Background Login**: Non-blocking login after server starts

## Testing

### Functional Tests

Test tool handlers with mocked client:

```bash
npm run test
```

### Integration Tests

Test MCP server with TestMCPClient (uses mock mode):

```bash
npm run test:integration
```

### Manual Tests

Test with real Fetch Pet credentials:

```bash
# Create .env with credentials
echo "FETCHPET_USERNAME=your-email" >> .env
echo "FETCHPET_PASSWORD=your-password" >> .env

# Run manual tests
npm run test:manual
```

**Important**: The `submit_claim` test is SKIPPED in manual tests to avoid actually submitting claims.

## Development Commands

```bash
npm run install-all      # Install all dependencies
npm run build            # Build TypeScript
npm run dev              # Development mode with auto-reload
npm run test             # Run functional tests
npm run test:integration # Run integration tests
npm run test:manual      # Run manual tests (needs credentials)
npm run lint             # Check linting
```

## DOM Selectors

The Fetch Pet website uses a React SPA. Key selector patterns:

- Login form: `input[type="email"]`, `input[type="password"]`, `button[type="submit"]`
- Claim cards: `.claim-card-data-list` with `.pet-name`, `.status-text.status`, `.claim-invoice-details.fw-700`
- Claim details modal: `.claim-details-popup-container`, `.details-link` to open
- Vet selection: `.rbt-input-main` (typeahead input)
- Diagnosis selection: `.MuiAutocomplete-input`
- Download links: `div:has-text("Explanation of Benefits")`, `div:has-text("Invoice")`

## Known Limitations

1. **React SPA**: Page loads require waiting for React to render
2. **Dynamic Content**: Some content loads asynchronously
3. **Bot Detection**: Uses stealth plugin but may still be detected occasionally
4. **Website Changes**: Selectors may break if Fetch Pet updates their UI
5. **Pet Selection**: The claim form pre-populates the pet based on the account; the `pet_name` parameter is used for identification but may not select a specific pet on multi-pet accounts
