# Post-Backend-Fix Test Results

## Summary

Backend fix was deployed but remote/canonical data is still NOT persisting. Testing shows the data is accepted by the API but the `remotes` and `canonicals` arrays remain empty.

## Test Date

2025-11-27 (after backend fix deployment)

## Backend Fix Deployed

According to the commit message, the backend was fixed to accept both `:remote`/`:canonical` AND `:remote_attributes`/`:canonical_attributes` parameter names. The fix should save data to:

- `mcp_server_remotes` table for remote endpoints
- `mcp_server_remote_canonicals` table for canonical URLs

## Test Case: Mercury Implementation (ID 11516)

### Test Setup

- **Implementation ID**: 11516 (Mercury)
- **Status**: live
- **mcp_server_id**: 7102 (HAS linked MCP server)
- **provider_id**: 6238 (HAS provider)

### Parameters Sent

```
mcp_implementation[provider_id]=6238
mcp_implementation[remote][0][url_direct]=https://mcp.mercury.com/mcp
mcp_implementation[remote][0][transport]=streamable_http
mcp_implementation[remote][0][authentication_method]=oauth
mcp_implementation[remote][0][cost]=free
mcp_implementation[remote][0][status]=live
mcp_implementation[remote][0][internal_notes]=Official Mercury endpoint - test 1764280182654
mcp_implementation[canonical][0][url]=https://mcp.mercury.com
mcp_implementation[canonical][0][scope]=subdomain
mcp_implementation[canonical][0][note]=Dedicated MCP subdomain - test 1764280182654
mcp_implementation[canonical][1][url]=https://docs.mercury.com/docs/what-is-mercury-mcp
mcp_implementation[canonical][1][scope]=url
mcp_implementation[canonical][1][note]=MCP landing page - test 1764280182654
```

**Note**: Using `:remote` and `:canonical` parameter names (NOT `:remote_attributes`/`:canonical_attributes`) since the backend fix should accept both.

### API Response (PUT /api/implementations/11516)

✅ **Status**: 200 OK
✅ **Response**: Full implementation JSON returned
✅ **updated_at**: Changed to "2025-11-27T21:56:22.706Z"

Response includes nested `mcp_server` object:

```json
{
  "id": 7102,
  "slug": "mercury-banking",
  "classification": "official",
  "tags": [],
  "remotes": [], // ❌ EMPTY - should have our remote
  "mcp_server_remotes_count": 0,
  "canonicals": [] // ❌ EMPTY - should have our canonicals
}
```

### Verification (GET /api/implementations/11516)

Retrieved the implementation after 2 second delay.

**Result**:

- ✅ `updated_at` timestamp shows the save occurred
- ❌ `mcp_server.remotes` array is **EMPTY** (should have 1 remote)
- ❌ `mcp_server.canonicals` array is **EMPTY** (should have 2 canonicals)
- ❌ Test timestamp (1764280182654) not found anywhere in response
- ❌ Remote internal notes not persisted
- ❌ Canonical notes not persisted

## Observations

1. **API accepts the parameters** without error (200 OK)
2. **Implementation record updates** (updated_at changes)
3. **Nested associations do NOT persist**:
   - `mcp_server.remotes` remains empty
   - `mcp_server.canonicals` remains empty
4. **Control fields work fine** (provider_id, regular fields)

## Hypothesis

The backend fix may have addressed parameter name mapping (`:remote_attributes` → `:remote`) but the actual **nested attributes processing** might not be working. Possible issues:

### 1. Missing `accepts_nested_attributes_for` in Model

The `McpImplementation` model may not have:

```ruby
accepts_nested_attributes_for :mcp_server_remotes
accepts_nested_attributes_for :canonical_urls  # or whatever the association is called
```

### 2. Association Name Mismatch

The parameters use `:remote` and `:canonical`, but the actual associations might be:

- `has_many :mcp_server_remotes` (not `:remotes`)
- `has_many :mcp_server_remote_canonicals` (not `:canonicals`)

If this is the case, the nested attributes should be:

- `mcp_implementation[mcp_server_remotes_attributes][0][...]`
- `mcp_implementation[mcp_server_remote_canonicals_attributes][0][...]`

### 3. Remotes Belong to MCP Server, Not Implementation

Looking at the response structure, remotes are shown under `mcp_server.remotes`, which suggests:

- Remote endpoints belong to the `mcp_server` record (ID 7102)
- NOT directly to the `mcp_implementation` record (ID 11516)

If this is true, we should be updating the MCP server record, not the implementation:

```
PUT /api/servers/7102
mcp_server[remotes_attributes][0][url_direct]=...
```

OR the implementation update needs to propagate changes to its associated mcp_server via `accepts_nested_attributes_for :mcp_server`.

### 4. Strong Parameters Not Permitting Nested Arrays

The controller's strong parameters might not be properly permitting the nested array structure. Need to verify:

```ruby
params.require(:mcp_implementation).permit(
  :provider_id,
  remote: [
    :id, :url_direct, :transport, # ... all fields
  ]
)
```

Should be:

```ruby
params.require(:mcp_implementation).permit(
  :provider_id,
  remote_attributes: [  # Note: _attributes suffix here too
    :id, :url_direct, :transport, # ...
  ]
)
```

## Recommended Backend Investigation

1. **Check the model associations**:
   - What are the actual association names?
   - Does `McpImplementation` have `accepts_nested_attributes_for` configured?
   - Do remotes belong to `mcp_implementation` or `mcp_server`?

2. **Check strong parameters**:
   - Are nested arrays properly permitted with the `[]` syntax?
   - Are the parameter names correct (`remote_attributes` vs `remote`)?

3. **Check the build_update_params method**:
   - Does it correctly transform the parameters?
   - Does it handle the nested array structure?

4. **Enable SQL logging** to see if INSERT/UPDATE statements are being generated for the nested tables

5. **Check for validation failures** on nested records that might be failing silently

## Test Script

See `test-mercury-v2.js` for the full test that reproduces this issue.

To run:

```bash
cd experimental/pulsemcp-cms-admin
node test-mercury-v2.js
```

Expected: `remotes` and `canonicals` arrays should be populated
Actual: Both arrays remain empty

## Impact

Cannot test or verify the client-side MCP server fix until the backend properly persists nested attributes. The client-side code is sending the correct parameter format, but the backend is not saving the associated records.
