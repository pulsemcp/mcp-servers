# Manual Testing Results

This file tracks manual test results for the Gmail MCP Server.

## Test Environment Setup

To run manual tests:

1. Obtain a Gmail API OAuth2 access token with `gmail.readonly` scope
2. Set the environment variable: `export GMAIL_ACCESS_TOKEN="your-token"`
3. Run: `npm run test:manual`

## Latest Test Results

_No manual tests have been run yet. This file will be updated when manual testing is performed._

## Test Checklist

- [ ] `listMessages` - List messages from inbox
- [ ] `listMessages` - Filter by query
- [ ] `getMessage` - Get message with full format
- [ ] `getMessage` - Get message with metadata format
