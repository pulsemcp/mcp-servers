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

**Commit:** 4a29222c40024effc5a1e9a3b07bc46e21182a87
**Date:** 2026-01-18
**Environment:** admin.staging.pulsemcp.com
**Overall:** 8/8 tests passed (100%)

### Notes

All tests pass successfully against the staging environment. The Proctor API is fully deployed and functional.

Tests verify:

- Tool discovery and registration works correctly (all 7 tools)
- `get_proctor_metadata` returns available runtimes and exams
- `get_machines` returns active machine list
- `run_exam` accepts exam configuration and returns results
- `save_result` successfully saves exam results to the database
- `get_prior_result` returns "no prior result" for non-existent mirrors
- `cancel_exam` returns error for non-existent machine/exam combinations
- `destroy_machine` returns error for non-existent machines

## Test Coverage

| Test                 | Status | Notes                                                     |
| -------------------- | ------ | --------------------------------------------------------- |
| Tool Discovery       | PASS   | All 7 tools registered correctly                          |
| get_proctor_metadata | PASS   | Returns 8 runtimes and 2 exams from staging               |
| run_exam             | PASS   | Accepts exam config and returns validation/execution info |
| save_result          | PASS   | Successfully saves results to database (Result ID: 157)   |
| get_prior_result     | PASS   | Returns "no prior result" for non-existent mirror         |
| get_machines         | PASS   | Returns list of active machines (1 found during testing)  |
| destroy_machine      | PASS   | Returns error for non-existent machine                    |
| cancel_exam          | PASS   | Returns error for non-existent machine/exam               |

## Test Output

```
 ✓ tests/manual/proctor.manual.test.ts (8 tests) 15140ms
    ✓ Proctor MCP Server - Manual Tests > Tool Discovery > should list all available tools
    ✓ Proctor MCP Server - Manual Tests > get_proctor_metadata > should retrieve available runtimes and exams
    ✓ Proctor MCP Server - Manual Tests > get_machines > should list active machines (may be empty)
    ✓ Proctor MCP Server - Manual Tests > run_exam > should execute an exam against an MCP server
    ✓ Proctor MCP Server - Manual Tests > save_result > should save exam results to the database
    ✓ Proctor MCP Server - Manual Tests > get_prior_result > should handle request for non-existent result
    ✓ Proctor MCP Server - Manual Tests > cancel_exam > should handle cancel request for non-running exam
    ✓ Proctor MCP Server - Manual Tests > destroy_machine > should handle destroy request for non-existent machine

  Test Files  1 passed (1)
     Tests  8 passed (8)
```
