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

**Commit:** bdf5cfcf219c945210b28330ae284f222d25cc92
**Date:** 2026-01-19 02:46 UTC
**Result:** 6/6 tests passed (100%)

### Summary

All manual tests pass successfully against the real Proctor API:

- **Tool Discovery**: 5 tools registered correctly (`get_proctor_metadata`, `save_result`, `get_machines`, `destroy_machine`, `cancel_exam`)
- **get_proctor_metadata**: Returns available runtimes (8 proctor-mcp-client versions) and exams (Auth Check, Init Tools List)
- **get_machines**: Successfully lists active Fly.io machines with full details
- **save_result**: Correctly handles API validation errors (expected behavior after parameter removal)
- **cancel_exam**: Correctly returns error for non-existent machine/exam
- **destroy_machine**: Correctly returns 404 error for non-existent machine

## Test Coverage

| Test                 | Status | Notes                                         |
| -------------------- | ------ | --------------------------------------------- |
| Tool Discovery       | PASS   | 5 tools registered as expected                |
| get_proctor_metadata | PASS   | Returns available runtimes and exams          |
| save_result          | PASS   | API validation error (expected after PR #251) |
| get_machines         | PASS   | Returns list of active machines               |
| destroy_machine      | PASS   | Returns 404 error for non-existent machine    |
| cancel_exam          | PASS   | Returns error for non-existent machine/exam   |
