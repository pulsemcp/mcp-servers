# Manual Testing Results

This file tracks manual test results for the PulseMCP CMS Admin MCP server.

## Test Requirements

Manual tests require:

- A valid PulseMCP Admin API key in the `.env` file
- Network connectivity to https://admin.pulsemcp.com

## Test History

### Latest Test Run

**Date:** 2025-01-22  
**Commit:** 582e80f  
**Status:** Not Run - Version Bump  
**Notes:** Manual tests require PULSEMCP_ADMIN_API_KEY which is not available in CI. This is a version bump (v0.0.2) to trigger npm publication with fixed scripts. Manual tests will be run by the PulseMCP team with production API credentials before actual usage.

## Running Manual Tests

```bash
# Ensure you have the API key set in .env
echo "PULSEMCP_ADMIN_API_KEY=your-key-here" > .env

# Run manual tests
npm run test:manual
```

## Test Coverage

Manual tests verify:

1. Real API connectivity
2. Newsletter post CRUD operations
3. Image upload functionality
4. Error handling with real API responses
5. Authentication with API keys
