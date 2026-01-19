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

**Commit:** 9f799dfe65de601a59884f39a2be901e83925a21
**Date:** 2026-01-19 18:57 UTC
**Result:** 7/7 manual tests passed, 19/19 functional tests passed

### Change Summary

This version (0.1.5) fixes the `preloaded_credentials` parameter validation:

- Fixed issue where empty object `{}` or partial objects for `preloaded_credentials` caused validation errors
- Empty/null/partial values are now correctly treated as "no credentials provided"
- Added manual test to verify empty `preloaded_credentials` doesn't trigger validation errors
- Added functional tests for `null`, empty object, and partial object cases

### Test Results

All 7 manual tests passed against staging API (`admin.staging.pulsemcp.com`):

- **Tool Discovery**: 5 tools registered correctly
- **get_proctor_metadata**: Returns 9 runtime versions and 2 exams
- **get_machines**: Successfully lists 2 active Fly.io machines
- **run_exam**: API validation works correctly (returned validation error for test config)
- **run_exam (empty credentials)**: **NEW** - Empty `preloaded_credentials: {}` accepted without Zod validation error
- **cancel_exam**: Returns error for non-existent machine/exam
- **destroy_machine**: Returns 404 error for non-existent machine

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
