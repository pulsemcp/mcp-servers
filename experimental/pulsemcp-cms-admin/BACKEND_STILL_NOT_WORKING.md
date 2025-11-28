# Backend Issue: Remote/Canonical Still Not Persisting After PR #1053

## Test Date & Time

2025-11-27 at 22:56 UTC (after PR #1053 was deployed)

## Summary

PR #1053 was deployed but remote endpoints and canonical URLs are **still not persisting** to the database.

## Test Case: Mercury Implementation

**Test Details:**

- Implementation ID: 11516
- MCP Server ID: 7102 (linked server exists)
- Provider ID: 6238 (provider exists)
- Status: live

**What I Sent:**

```
PUT /api/implementations/11516

mcp_implementation[provider_id]=6238
mcp_implementation[remote][0][url_direct]=https://test-mercury-v3.example.com/mcp-1764347414681
mcp_implementation[remote][0][transport]=sse
mcp_implementation[remote][0][display_name]=Test Mercury Remote 1764347414681
mcp_implementation[remote][0][internal_notes]=TEST TIMESTAMP 1764347414681
mcp_implementation[canonical][0][url]=https://test-mercury-v3.example.com/1764347414681
mcp_implementation[canonical][0][scope]=url
mcp_implementation[canonical][0][note]=TEST CANONICAL 1764347414681
```

**What Happened:**

1. ✅ API returned 200 OK
2. ✅ No errors reported
3. ❌ Subsequent GET shows:
   - `mcp_server.remotes` = [] (empty, count: 0)
   - `mcp_server.canonicals` = [] (empty, count: 0)
   - `updated_at` did NOT change (still shows: 2025-11-27T18:55:32.587Z)

## Key Observation

The `updated_at` timestamp on the implementation **did not change** after our PUT request. This suggests:

- The save operation may not actually be executing
- OR the parameters are being filtered out before reaching the service layer
- OR there's a validation failure that's being silently ignored

## Reproduction

Run this test:

```bash
cd experimental/pulsemcp-cms-admin
node test-mercury-v3.js
```

Expected: remotes/canonicals arrays populated with test data
Actual: Both arrays remain empty, updated_at unchanged

## Questions for Backend Team

1. **Is PR #1053 actually deployed to production?**
   - The timestamp shows the implementation hasn't been updated since 18:55:32 UTC
   - Our test ran at 22:56 UTC but updated_at didn't change

2. **Are the parameters reaching the service layer?**
   - Can you add logging to see if the service receives the `:remote` and `:canonical` parameters?

3. **Are there validation failures?**
   - Could there be silent validation failures on the nested records?
   - Are errors being swallowed somewhere?

4. **Does the endpoint require specific parameter format?**
   - Should we use `remote_attributes` instead of `remote`?
   - PR #1053 mentions adding `internal_notes` and `display_name` support - are those required fields?

5. **Table structure question:**
   - Where should remotes be stored?
   - The response shows them under `mcp_server.remotes` - do they belong to the MCP server record (7102), not the implementation (11516)?
   - If remotes belong to the server, should we be hitting `/api/servers/7102` instead?

## What's Working

- ✅ Regular implementation fields (name, description, provider_id, etc.) save correctly
- ✅ The API accepts the request without error
- ✅ Other implementations can be updated successfully

## What's Not Working

- ❌ Remote endpoints don't persist
- ❌ Canonical URLs don't persist
- ❌ `updated_at` timestamp doesn't change after PUT with remote/canonical data
- ❌ No error messages to indicate what's wrong

## Request

Can the backend team:

1. Verify PR #1053 is deployed to production
2. Add debug logging to see if remote/canonical params are reaching the service
3. Check for validation failures that might be swallowed
4. Clarify the correct API endpoint (implementation vs server)
5. Provide example curl command that successfully creates a remote endpoint

## Test Data Available

We have test timestamps in the data that can be searched:

- Timestamp: 1764347414681
- Display name: "Test Mercury Remote 1764347414681"
- Internal notes: "TEST TIMESTAMP 1764347414681"

If this data is in the database but not showing in the API response, that would indicate a different issue (serialization/response building).
