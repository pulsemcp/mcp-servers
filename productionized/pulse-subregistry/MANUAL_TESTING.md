# Manual Testing

This file tracks manual testing results for the pulse-subregistry MCP server.

## Latest Test Results

**Test Date:** 2026-01-25
**Branch:** tadasant/add-switch-tenant-id-tool
**Commit:** 872cd0b
**Tested By:** Claude
**Environment:** Real API with pulsemcp-admin tenant

### Test Results

**Type:** Full manual testing with real PulseMCP API
**Status:** All tests passing (7/7)
**Pass Rate:** 100%

### list_servers tool

- [x] Returns list of servers from the Sub-Registry (30 servers returned)
- [x] Search filtering works correctly (search "github" returns relevant results)
- [x] Pagination works with cursor (2 pages tested with no overlap)
- [x] Limit parameter works correctly (limit=5 returned 5 servers)
- [x] Rate limiting handled gracefully (5 parallel requests succeeded)

### get_server tool

- [x] Returns server details for a known server (`io.github.upstash/context7`)
- [x] "latest" version works as default
- [x] Server not found error is handled correctly (returned proper error message)

### Sample API Response

Successfully retrieved server details including:

- Server name/title: `Context7`
- Description: `Up-to-date code docs for any prompt`
- Version: `1.0.30`
- Repository: `https://github.com/upstash/context7`
- Website: `https://context7.com`
- Icons, remotes, and package information

### Test Output Summary

```
Tests: 7 passed (7)
- list_servers > should list servers from the Sub-Registry (551ms)
- list_servers > should respect limit parameter (305ms)
- list_servers > should search servers by name/description (425ms)
- list_servers > should support pagination with cursor (705ms)
- get_server > should get server details with latest version (774ms)
- get_server > should handle server not found error (389ms)
- error handling > should handle rate limiting gracefully (646ms)
```

## Test Requirements

To run manual tests, you will need:

1. A valid PulseMCP API key
2. Set the `PULSEMCP_SUBREGISTRY_API_KEY` environment variable
3. Optionally set `PULSEMCP_SUBREGISTRY_TENANT_ID` for multi-tenant access

## Running Manual Tests

```bash
# Set up environment
export PULSEMCP_SUBREGISTRY_API_KEY=your-api-key
export PULSEMCP_SUBREGISTRY_TENANT_ID=your-tenant-id  # optional

# Or create a .env file (do NOT commit this file)
echo "PULSEMCP_SUBREGISTRY_API_KEY=your-api-key" > .env
echo "PULSEMCP_SUBREGISTRY_TENANT_ID=your-tenant-id" >> .env

# Run manual tests
npm run test:manual
```
