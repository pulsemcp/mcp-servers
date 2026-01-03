# Manual Testing Results

## Test Run: 2026-01-03

**Commit:** 033745813bd59576b7a87f1a378d156ab52a9a1d

**Authentication Method:** Service Account with Domain-Wide Delegation

**Environment:**

- Node.js v22.x
- Service account with gmail.readonly scope
- Impersonating: tadas@tadasant.com

### Test Results

```
 ✓ tests/manual/gmail-client.test.ts (7 tests) 1866ms
   ✓ Gmail Client - Manual Tests > listMessages > should list messages from inbox  573ms
   ✓ Gmail Client - Manual Tests > listMessages > should filter by query
   ✓ Gmail Client - Manual Tests > listMessages > should filter by time horizon (24 hours)
   ✓ Gmail Client - Manual Tests > getMessage > should get a message with full format  356ms
   ✓ Gmail Client - Manual Tests > getMessage > should get a message with metadata format
   ✓ Gmail Client - Manual Tests > getMessage > should decode email body content  304ms
   ✓ Gmail Client - Manual Tests > authentication > should report authentication method

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

### Verification Details

1. **Service Account Authentication**: Successfully authenticated using domain-wide delegation
2. **List Messages**: Retrieved 5 messages from inbox, 10-20 messages from last 24 hours
3. **Get Message**: Successfully retrieved full message with headers and body
4. **Body Decoding**: Successfully decoded base64url encoded email body content
5. **Message Preview**: Verified email content from `Google <no-reply@accounts.google.com>` with subject "Security alert"

### Notes

- All tests passed on first run
- Service account authentication with domain-wide delegation works correctly
- Token caching is functional (subsequent requests use cached token)
