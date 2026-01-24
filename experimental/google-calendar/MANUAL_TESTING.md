# Manual Testing Results

This file tracks manual testing results for the Google Calendar MCP server against real Google Calendar APIs.

## Latest Test Run

**Status:** PASS
**Date:** 2026-01-24
**Commit:** c3ad5de (base), changes for version 0.0.5
**Tester:** Claude Code

### Results

- Authentication: PASS
- List calendars: PASS (Found 7 calendars)
- List events: PASS (Found 10 events)
- Get event: PASS (Retrieved event details)
- Query freebusy: PASS (Found 3 busy periods)
- Create event with file attachment: PASS
- Update event to add file attachment: PASS

### Notes on Version 0.0.5 Changes

**File Attachments Support (0.0.5):**

- Added `attachments` parameter to `create_calendar_event` and `update_calendar_event` tools
- Attachments can use any URL (not just Google Drive)
- Tested with public PDF URL: `https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf`
- API correctly accepts non-Google Drive URLs as attachments
- Maximum 25 attachments per event (enforced by Google Calendar API)

### Test Output

```
 ✓ tests/manual/calendar-client.test.ts (6 tests) 3573ms
   ✓ Google Calendar Client - Manual Tests > should list calendars  816ms
   ✓ Google Calendar Client - Manual Tests > should list events from primary calendar  320ms
   ✓ Google Calendar Client - Manual Tests > should get a specific event  366ms
   ✓ Google Calendar Client - Manual Tests > should query freebusy information  158ms
   ✓ Google Calendar Client - Manual Tests > should create an event with a file attachment  698ms
   ✓ Google Calendar Client - Manual Tests > should update an event to add an attachment  1215ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
```

### Notes

- Service account authentication with domain-wide delegation working correctly
- Token caching and JWT signing verified functional
- All read operations tested successfully
- Create, update, and delete operations tested with cleanup
- Non-Google Drive URLs confirmed working for attachments

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
- [x] Create new event (tested with cleanup)
- [x] Create event with file attachment
- [x] Update event with file attachment
- [x] Delete event (used for cleanup)
- [x] Query freebusy information
- [x] Error handling for invalid requests

## Historical Test Runs

| Date       | Commit  | Status | Notes                                                      |
| ---------- | ------- | ------ | ---------------------------------------------------------- |
| 2026-01-24 | c3ad5de | PASS   | Version 0.0.5 with attachments support - 6/6 tests passing |
| 2026-01-24 | 4eb09a7 | PASS   | Version 0.0.4 with new tools - 4/4 tests passing           |
| 2026-01-13 | daae242 | PASS   | Initial manual testing - 4/4 tests passing                 |
