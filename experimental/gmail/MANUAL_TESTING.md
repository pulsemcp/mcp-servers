# Manual Testing Results

## Test Run: 2026-01-03 (v0.0.3 - Publish Fix)

**Commit:** 36568ff (v0.0.2 tests remain valid - only restored missing publish script, no code changes)

**Authentication Method:** Service Account with Domain-Wide Delegation (via environment variables)

**Environment:**

- Node.js v22.x
- Service account with gmail.readonly scope
- Impersonating: tadas@tadasant.com

**Environment Variables Used:**

- `GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL`: Service account email address
- `GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY`: Private key with `\n` literals (newline conversion working)
- `GMAIL_IMPERSONATE_EMAIL`: Email address to impersonate

### Test Results

```
 ✓ tests/manual/gmail-client.test.ts (7 tests) 2084ms
   ✓ Gmail Client - Manual Tests > listMessages > should list messages from inbox  723ms
   ✓ Gmail Client - Manual Tests > listMessages > should filter by query
   ✓ Gmail Client - Manual Tests > listMessages > should filter by time horizon (24 hours)
   ✓ Gmail Client - Manual Tests > getMessage > should get a message with full format  341ms
   ✓ Gmail Client - Manual Tests > getMessage > should get a message with metadata format  319ms
   ✓ Gmail Client - Manual Tests > getMessage > should decode email body content  304ms
   ✓ Gmail Client - Manual Tests > authentication > should use service account authentication

 Test Files  1 passed (1)
      Tests  7 passed (7)
```

### Verification Details

1. **Service Account Authentication**: Successfully authenticated using domain-wide delegation with env vars
2. **Newline Handling**: Private key with `\n` literals correctly converted to actual newlines
3. **List Messages**: Retrieved 5 messages from inbox, 10-20 messages from last 24 hours
4. **Get Message**: Successfully retrieved full message with headers and body
5. **Body Decoding**: Successfully decoded base64url encoded email body content
6. **Message Preview**: Verified email content from `Google <no-reply@accounts.google.com>` with subject "Security alert"

### Notes

- All 7 tests passed on first run
- Environment variable-based authentication works correctly
- Newline conversion for private key (`\n` → actual newlines) verified working

---

## Previous Test Run: 2026-01-03 (v0.0.1)

**Commit:** e668d3de6bedb40e31d3bec7db8b88e1e19f1a9c

**Authentication Method:** Service Account with Domain-Wide Delegation (via file path)

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
