# CLAUDE.md - AppSignal Client

This directory contains the core AppSignal API client implementation that handles all external API interactions.

## ⚠️ IMPORTANT: Manual Testing Required

**Any changes to files in this directory MUST be tested with the manual test suite before merging.**

The manual tests verify that our GraphQL queries and API interactions work correctly with the real AppSignal API. This is critical because:

1. **GraphQL Query Validation** - Ensures queries are properly structured and don't cause API errors
2. **Response Shape Verification** - Confirms the actual API responses match our interfaces
3. **Error Handling** - Tests that API errors are properly caught and handled
4. **Field Compatibility** - Prevents issues like the `attributes` field that caused 500 errors

## Running Manual Tests

```bash
# From the experimental/appsignal directory
cd ../..  # Go to appsignal root

# Ensure you have API credentials
cp .env.example .env
# Edit .env and add your APPSIGNAL_API_KEY

# Run manual tests
npm run test:manual
```

## Files That Require Manual Testing

When modifying any of these files, manual tests are mandatory:

- `appsignal-client.ts` - Core client class
- `lib/get-apps.ts` - App listing queries
- `lib/search-logs.ts` - Log search queries (especially sensitive to field changes)
- `lib/exception-incident.ts` - Exception incident queries
- `lib/exception-incident-sample.ts` - Exception sample queries
- `lib/log-incident.ts` - Log incident queries

## Known API Limitations

- **No direct app queries** - Must use `viewer.organizations.apps` structure
- **Attributes field causes 500 errors** - This field has been removed from all queries
- **No incident listing endpoint** - Can only fetch incidents by ID

## Pre-Merge Checklist

- [ ] Run `npm run test:manual` and verify SUCCESS outcome
- [ ] Check for any new WARNING messages that might indicate API changes
- [ ] Ensure no 400/500 errors in test output
- [ ] Document any new API limitations discovered
