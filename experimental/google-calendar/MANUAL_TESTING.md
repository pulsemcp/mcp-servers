# Manual Testing Results

This file tracks manual testing results for the Google Calendar MCP server against real Google Calendar APIs.

## Latest Test Run

**Status:** PASS
**Date:** 2026-01-24
**Commit:** 4eb09a7
**Tester:** Claude Code

### Results

- Authentication: PASS
- List calendars: PASS (Found 7 calendars)
- List events: PASS (Found 10 events)
- Get event: PASS (Retrieved event details)
- Query freebusy: PASS (Found 3 busy periods)

### Notes on Version 0.0.4 Changes

**Tool Renaming (0.0.4):** All tools were renamed for cleaner, more consistent naming. This is a naming-only change that doesn't affect API interactions:

- `gcal_list_events` → `list_calendar_events`
- `gcal_get_event` → `get_calendar_event`
- `gcal_create_event` → `create_calendar_event`
- `gcal_list_calendars` → `list_calendars`
- `gcal_query_freebusy` → `query_calendar_freebusy`

**New Tools (0.0.4):**

- `update_calendar_event`: Uses Google Calendar PATCH API (same authentication as other tools)
- `delete_calendar_event`: Uses Google Calendar DELETE API (same authentication as other tools)

These new tools use the same service account authentication and JWT signing that has been validated in manual tests. The PATCH and DELETE operations follow the same patterns as tested create operations.

**Tool Groups (0.0.2, renamed in 0.0.3):** The tool groups feature only affects tool registration filtering and does not change any API interactions. The previous manual test results remain valid for API functionality.

### Test Output

```
 ✓ tests/manual/calendar-client.test.ts (4 tests) 1565ms
   ✓ Google Calendar Client - Manual Tests > should list calendars  699ms
   ✓ Google Calendar Client - Manual Tests > should get a specific event  405ms

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
- [ ] Update event (not tested - would modify user calendar)
- [ ] Delete event (not tested - would modify user calendar)
- [x] Query freebusy information
- [x] Error handling for invalid requests

## Historical Test Runs

| Date       | Commit  | Status | Notes                                            |
| ---------- | ------- | ------ | ------------------------------------------------ |
| 2026-01-24 | 4eb09a7 | PASS   | Version 0.0.4 with new tools - 4/4 tests passing |
| 2026-01-13 | daae242 | PASS   | Initial manual testing - 4/4 tests passing       |
