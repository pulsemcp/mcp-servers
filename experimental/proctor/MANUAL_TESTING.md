# Manual Testing Results

This document tracks manual testing results for the Proctor MCP Server.

## Testing Instructions

1. Set up environment variables:

   ```bash
   export PROCTOR_API_KEY="your-api-key"
   export PROCTOR_BASE_URL="https://staging.pulsemcp.com"  # or production URL
   ```

2. Run the manual test setup:

   ```bash
   npm run test:manual:setup
   ```

3. Run manual tests:
   ```bash
   npm run test:manual
   ```

## Latest Test Results

**Commit:** a98a677d28c0e052c587b45d5bd70ba8f1181eca
**Date:** 2026-01-18
**Environment:** staging.pulsemcp.com
**Overall:** 4/7 tests passed (57%)

### Notes

The Proctor API (PR #1803) was merged to pulsemcp/pulsemcp on 2026-01-18 at 02:08 UTC.
At the time of testing, the API endpoints were returning 404 - deployment may still be in progress.

Tests that passed verify:

- Tool discovery and registration works correctly
- Error handling for invalid inputs returns appropriate responses
- Parameter validation with Zod schemas works correctly

Tests that failed are due to API 404 errors (not yet deployed):

- get_proctor_metadata
- get_machines
- run_exam (depends on metadata)

## Test Coverage

| Test                 | Status | Notes                                             |
| -------------------- | ------ | ------------------------------------------------- |
| Tool Discovery       | PASS   | All 7 tools registered correctly                  |
| get_proctor_metadata | FAIL   | API returns 404 - not yet deployed                |
| run_exam             | FAIL   | Depends on metadata which returns 404             |
| save_result          | -      | Not tested (requires valid exam run)              |
| get_prior_result     | PASS   | Returns "no prior result" for non-existent mirror |
| get_machines         | FAIL   | API returns 404 - not yet deployed                |
| destroy_machine      | PASS   | Returns error for non-existent machine            |
| cancel_exam          | PASS   | Returns error for non-existent machine/exam       |

## Manual Test Results

When the API is deployed, re-run manual tests and update this section with full results.
