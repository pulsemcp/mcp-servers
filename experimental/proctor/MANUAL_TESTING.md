# Manual Testing Results

This document tracks manual testing results for the Proctor MCP Server.

## Testing Instructions

1. Set up environment variables:

   ```bash
   export PROCTOR_API_KEY="your-api-key"
   export PROCTOR_API_URL="https://admin.staging.pulsemcp.com"  # or https://admin.pulsemcp.com for production
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

**Commit:** 140060d87ea2629fbb8e041b4086ce8eb56dec33
**Date:** 2026-03-12 23:24 UTC
**Result:** 7/7 manual tests passed, 35/35 functional tests passed

### Change Summary

This version adds auto-truncation of exam results and the `expand_fields` parameter to `run_exam`:

- Added auto-truncation utility (same pattern as pulse-subregistry) to reduce oversized exam result responses
- Strings > 200 chars are replaced with truncation messages pointing to `expand_fields`
- Deep nested objects (depth >= 6, > 500 chars) are similarly truncated
- New `expand_fields` parameter allows selectively expanding truncated fields
- Added 13 truncation unit tests and 3 run_exam truncation functional tests

### Test Results

All 7 manual tests passed against staging API (`admin.staging.pulsemcp.com`):

- **Tool Discovery**: 5 tools registered correctly
- **get_proctor_metadata**: Returns 11 runtime versions and 2 exams
- **get_machines**: Successfully lists 3 active Fly.io machines
- **run_exam**: API validation works correctly (returned validation error for test runtime)
- **run_exam (empty credentials)**: Empty `preloaded_credentials: {}` accepted without Zod validation error
- **cancel_exam**: Returns error for non-existent machine/exam
- **destroy_machine**: Returns 404 error for non-existent machine

### Previous Test Results (v0.1.5)

Commit 9f799dfe65de601a59884f39a2be901e83925a21 (2026-01-19 18:57 UTC) - 7/7 manual tests passed, 19/19 functional tests passed

### Previous Test Results (v0.1.2-0.1.4)

Commit 2ddeaf97b2174590698e0c55840d07a6dd82fd00 (2026-01-19 03:20 UTC) - 6/6 tests passed

## Test Coverage

| Test                         | Status | Notes                                           |
| ---------------------------- | ------ | ----------------------------------------------- |
| Tool Discovery               | PASS   | 5 tools registered as expected                  |
| get_proctor_metadata         | PASS   | Returns available runtimes and exams            |
| run_exam                     | PASS   | API validation works correctly                  |
| run_exam (empty credentials) | PASS   | Empty `preloaded_credentials` handled correctly |
| get_machines                 | PASS   | Returns list of active machines                 |
| destroy_machine              | PASS   | Returns 404 error for non-existent machine      |
| cancel_exam                  | PASS   | Returns error for non-existent machine/exam     |
