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

**Commit:** bd7e6b33734084defea4c6a8eb443859c5e4ba1f
**Date:** 2026-01-18
**Environment:** admin.staging.pulsemcp.com
**Overall:** 7/7 tests passed (100%)

### Notes

All tests pass successfully against the staging environment. The Proctor API is fully deployed and functional.

Tests verify:

- Tool discovery and registration works correctly (all 7 tools)
- `get_proctor_metadata` returns available runtimes and exams
- `get_machines` returns active machine list
- `run_exam` accepts exam configuration and returns results
- `get_prior_result` returns "no prior result" for non-existent mirrors
- `cancel_exam` returns error for non-existent machine/exam combinations
- `destroy_machine` returns error for non-existent machines

## Test Coverage

| Test                 | Status | Notes                                                     |
| -------------------- | ------ | --------------------------------------------------------- |
| Tool Discovery       | PASS   | All 7 tools registered correctly                          |
| get_proctor_metadata | PASS   | Returns 8 runtimes and 2 exams from staging               |
| run_exam             | PASS   | Accepts exam config and returns validation/execution info |
| save_result          | -      | Not tested (requires completed exam run with results)     |
| get_prior_result     | PASS   | Returns "no prior result" for non-existent mirror         |
| get_machines         | PASS   | Returns list of active machines (1 found during testing)  |
| destroy_machine      | PASS   | Returns error for non-existent machine                    |
| cancel_exam          | PASS   | Returns error for non-existent machine/exam               |

## Test Output

```
 ✓ tests/manual/proctor.manual.test.ts (7 tests) 12541ms
    ✓ Proctor MCP Server - Manual Tests > Tool Discovery > should list all available tools
    ✓ Proctor MCP Server - Manual Tests > get_proctor_metadata > should retrieve available runtimes and exams
    ✓ Proctor MCP Server - Manual Tests > get_machines > should list active machines (may be empty)
    ✓ Proctor MCP Server - Manual Tests > run_exam > should execute an exam against an MCP server
    ✓ Proctor MCP Server - Manual Tests > get_prior_result > should handle request for non-existent result
    ✓ Proctor MCP Server - Manual Tests > cancel_exam > should handle cancel request for non-running exam
    ✓ Proctor MCP Server - Manual Tests > destroy_machine > should handle destroy request for non-existent machine

  Test Files  1 passed (1)
     Tests  7 passed (7)
```
