# Manual Testing

This file tracks manual testing results for the pulse-subregistry MCP server.

## Latest Test Results

**Test Date:** 2026-03-11
**Branch:** agent/fix-latest-only-false-version-param
**Commit:** 5e84b0d
**Tested By:** Claude
**Environment:** Real API with tenant `pulsemcp-admin`

### Test Results

**Pass Rate:** 7/7 (100%)

```
Tests: 7 passed (7)
- list_servers > should list servers from the Sub-Registry (1922ms)
- list_servers > should respect limit parameter (648ms)
- list_servers > should search servers by name/description (645ms)
- list_servers > should return all versions when latest_only=false (1569ms)
- list_servers > should return only latest versions by default (latest_only=true) (640ms)
- list_servers > should support pagination with cursor (320ms)
- get_server > should get server details (306ms)
```

### list_servers tool

- [x] Returns list of servers from the Sub-Registry (30 servers returned with default settings)
- [x] Search filtering works correctly (search "github" returns relevant results)
- [x] Pagination works (tested with limit=2)
- [x] Limit parameter works correctly (limit=5 returned 5 servers)
- [x] `latest_only=false` returns all versions including both latest and non-latest (100 servers: 9 latest, 91 non-latest)
- [x] `latest_only=true` (default) returns only latest versions (10 servers, all with isLatest=true)

### get_server tool

- [x] Returns server details when queried with server name

### Key Verification for Bug Fix (Issue #434)

- [x] E2E: With `latest_only=false` and `limit=100`, the API returned 100 servers: 9 with `isLatest: true` and 91 with `isLatest: false`, confirming that all versions (both latest and non-latest) are returned
- [x] E2E: With `latest_only=true` (default), all 10 returned servers had `isLatest: true`, confirming the filter works correctly
- [x] The fix ensures the `version` query parameter is completely omitted (not set to `undefined` or `false`) when `latest_only=false`

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
