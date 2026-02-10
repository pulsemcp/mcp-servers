# Manual Testing

## Prerequisites

1. Commit all changes
2. Create `.env` from `.env.example` with your `VERCEL_TOKEN`
3. Run `npm run test:manual:setup` (first time only)

## Running Manual Tests

```bash
npm run test:manual
```

## Latest Test Results

**Commit:** 111e4f8
**Date:** 2026-02-10
**Test count:** 8 tests (3 SUCCESS, 5 WARNING - no deployments/projects on test account)

### Results Summary

| Test                               | Result  | Details                                           |
| ---------------------------------- | ------- | ------------------------------------------------- |
| list_deployments - real API        | SUCCESS | Found 0 deployments (API responded correctly)     |
| list_deployments - filter by state | SUCCESS | Found 0 READY deployments (state filter accepted) |
| list_projects - real API           | SUCCESS | Found 0 projects (API responded correctly)        |
| get_deployment - real API          | WARNING | No deployments found to test with                 |
| get_deployment_events - real API   | WARNING | No deployments found to test with                 |
| get_runtime_logs - real API        | WARNING | No projects found to test with                    |
| get_runtime_logs - with filters    | WARNING | No projects found to test with                    |
| get_runtime_logs - with search     | WARNING | No projects found to test with                    |

### Notes

- The Vercel account used for testing has no projects or deployments, so tests requiring deployment data gracefully skip
- All API connection and response parsing is verified through list_deployments and list_projects tests
- The runtime log filtering tests (since/until, level, search, source, direction, limit) send the correct parameters to the API but cannot verify response filtering without deployment data
- To fully test get_deployment, get_deployment_events, and get_runtime_logs, use a token for an account with active deployments
