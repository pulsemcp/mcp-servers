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

**Note:** Manual tests need to be re-run after removing `run_exam` and `get_prior_result` tools.

## Test Coverage

| Test                 | Status  | Notes                                       |
| -------------------- | ------- | ------------------------------------------- |
| Tool Discovery       | PENDING | Should register 5 tools                     |
| get_proctor_metadata | PENDING | Returns available runtimes and exams        |
| save_result          | PENDING | Saves results to database                   |
| get_machines         | PENDING | Returns list of active machines             |
| destroy_machine      | PENDING | Returns error for non-existent machine      |
| cancel_exam          | PENDING | Returns error for non-existent machine/exam |
