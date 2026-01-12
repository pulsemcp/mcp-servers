# Manual Testing Results

This file tracks manual testing results for the Google Calendar MCP server against real Google Calendar APIs.

## Latest Test Run

**Status**: Not yet tested
**Date**: N/A
**Commit**: N/A
**Tester**: N/A

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

- [ ] Service account authentication
- [ ] Token refresh and caching
- [ ] List calendars
- [ ] List events from primary calendar
- [ ] Get specific event details
- [ ] Create new event
- [ ] Query freebusy information
- [ ] Error handling for invalid requests

## Test Results Template

```
**Status**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
**Date**: YYYY-MM-DD
**Commit**: abc123def
**Tester**: Name

### Results
- Authentication: ✅
- List calendars: ✅
- List events: ✅
- Get event: ✅
- Create event: ⚠️ (note any issues)
- Query freebusy: ✅

### Notes
- Any observations or issues discovered
- API rate limiting behavior
- Performance observations
```
