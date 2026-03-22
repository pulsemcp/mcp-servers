# Aetna Claims MCP Server Development Guide

This document provides development guidance for the Aetna Claims MCP Server.

## Overview

This MCP server provides Playwright-based browser automation for Aetna health insurance claims management. It follows the same architecture as the Fetch Pet MCP server with the addition of email-based 2FA support via IMAP.

## Architecture

### Core Components

1. **AetnaClaimsClient** (`shared/src/server.ts`)
   - Main browser automation client using Playwright
   - Handles login with email 2FA via IMAP
   - Navigates and interacts with the Aetna health portal

2. **Tools** (`shared/src/tools.ts`)
   - Defines MCP tools and their handlers
   - Each tool validates input, calls the client, and formats output

3. **Types** (`shared/src/types.ts`)
   - TypeScript interfaces for data structures
   - Zod schemas for input validation

### Key Patterns

- **Lazy Browser Initialization**: Browser launches on first tool use
- **Persistent Session**: Single browser/context/page across all tool calls
- **Elicitation Confirmation**: Uses `@pulsemcp/mcp-elicitation` for user confirmation before claim submission
- **Background Login**: Non-blocking login after server starts
- **Email 2FA**: Polls IMAP inbox for Aetna verification codes during login

## Testing

### Functional Tests

Test tool handlers with mocked client:

```bash
npm run test
```

### Manual Tests

Test with real Aetna credentials:

```bash
# Create .env with credentials
echo "AETNA_USERNAME=your-username" >> .env
echo "AETNA_PASSWORD=your-password" >> .env
echo "EMAIL_IMAP_USER=your-email@gmail.com" >> .env
echo "EMAIL_IMAP_PASSWORD=your-app-password" >> .env

# Run manual tests
npm run test:manual
```

**Important**: The `submit_claim` test is SKIPPED in manual tests to avoid actually submitting claims.

## DOM Selectors

The Aetna health portal at https://health.aetna.com uses a React SPA. Key areas:

- Login: `https://health.aetna.com/login`
- Claims: `https://health.aetna.com/digital-claims`
- Claim submission is a multi-step form (Step 1: Details, Step 2: Review, Step 3: Confirmation)

## Known Limitations

1. **React SPA**: Page loads require waiting for React to render
2. **2FA Dependency**: Requires IMAP email access for two-factor authentication
3. **Bot Detection**: Uses stealth plugin but may still be detected
4. **Website Changes**: Selectors may break if Aetna updates their UI
5. **Email Polling**: 2FA code retrieval depends on email delivery timing
