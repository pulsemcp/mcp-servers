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

**Commit:** 2ddeaf97b2174590698e0c55840d07a6dd82fd00
**Date:** 2026-01-19 03:20 UTC
**Result:** 6/6 tests passed (100%)

Note: This version bump adds `no_result_persistence: true` to run_exam API calls.
This is a pass-through parameter that doesn't affect the MCP server's behavior -
it only affects how the proctor backend handles OAuth credentials during exams.

### Summary

All manual tests pass successfully against the real Proctor API:

- **Tool Discovery**: 5 tools registered correctly (`get_proctor_metadata`, `run_exam`, `get_machines`, `destroy_machine`, `cancel_exam`)
- **get_proctor_metadata**: Returns available runtimes (8 proctor-mcp-client versions) and exams (Auth Check, Init Tools List)
- **get_machines**: Successfully lists active Fly.io machines with full details
- **run_exam**: Correctly validates mcp.json format (returned validation error for test config)
- **cancel_exam**: Correctly returns error for non-existent machine/exam
- **destroy_machine**: Correctly returns 404 error for non-existent machine

## Test Coverage

| Test                 | Status | Notes                                       |
| -------------------- | ------ | ------------------------------------------- |
| Tool Discovery       | PASS   | 5 tools registered as expected              |
| get_proctor_metadata | PASS   | Returns available runtimes and exams        |
| run_exam             | PASS   | API validation works correctly              |
| get_machines         | PASS   | Returns list of active machines             |
| destroy_machine      | PASS   | Returns 404 error for non-existent machine  |
| cancel_exam          | PASS   | Returns error for non-existent machine/exam |
