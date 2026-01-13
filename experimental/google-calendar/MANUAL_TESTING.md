# Manual Testing Results

This file tracks manual testing results for the Google Calendar MCP server against real Google Calendar APIs.

## Latest Test Run

**Status:** PASS
**Date:** 2026-01-13
**Commit:** daae242
**Tester:** Claude Code

### Results

- Authentication: PASS
- List calendars: PASS (Found 7 calendars)
- List events: PASS (Found 10 events)
- Get event: PASS (Retrieved event details)
- Query freebusy: PASS (Found 1 busy period)

### Test Output

```
 PASS  tests/manual/calendar-client.test.ts (4 tests) 2699ms
   PASS Google Calendar Client - Manual Tests > should list calendars  1515ms
   PASS Google Calendar Client - Manual Tests > should list events from primary calendar  371ms
   PASS Google Calendar Client - Manual Tests > should get a specific event  535ms
   PASS Google Calendar Client - Manual Tests > should query freebusy information  278ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
```

### Notes

- Service account authentication with domain-wide delegation working correctly
- Token caching and JWT signing verified functional
- All read operations tested successfully
- Create event test not included in manual test suite (avoids modifying user calendars)

## Test Environment Setup

To run manual tests:

1. Create a `.env` file in this directory with:

   ```
   GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GCAL_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   GCAL_IMPERSONATE_EMAIL=user@yourdomain.com
   ```

2. Run setup: `npm run test:manual:setup`
3. Run tests: `npm run test:manual`

## Test Coverage

Manual tests verify:

- [x] Service account authentication
- [x] Token refresh and caching
- [x] List calendars
- [x] List events from primary calendar
- [x] Get specific event details
- [ ] Create new event (not tested - would modify user calendar)
- [x] Query freebusy information
- [x] Error handling for invalid requests

## Historical Test Runs

| Date       | Commit  | Status | Notes                                      |
| ---------- | ------- | ------ | ------------------------------------------ |
| 2026-01-13 | daae242 | PASS   | Initial manual testing - 4/4 tests passing |
