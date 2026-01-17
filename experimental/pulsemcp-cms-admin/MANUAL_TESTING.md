# Manual Testing Results

## Latest Test Results

**Date:** 2026-01-17
**Commit:** 13daf9f
**Version:** 0.6.0
**API Environment:** Staging (https://staging.pulsemcp.com)
**API Key:** Admin API key (read/write)

## Test Results Summary

### Overall: ✅ 47/47 Existing Tests PASSING + 18 New REST API Tools (Awaiting Backend)

**Note:** v0.6.0 adds 18 new REST API tools for managing PulseMCP admin resources. These tools are implemented and ready but are **awaiting backend API deployment** (pulsemcp/pulsemcp PR #1799):

**New Tool Groups Added:**

- `unofficial_mirrors` / `unofficial_mirrors_readonly`: CRUD operations for unofficial mirrors
- `official_mirrors_readonly`: Read operations for official mirrors from MCP Registry
- `tenants_readonly`: Read operations for tenants
- `secrets` / `secrets_readonly`: CRUD operations for 1Password secret references
- `mcp_jsons` / `mcp_jsons_readonly`: CRUD operations for MCP JSON configurations

**New Tools (18 total):**

- Unofficial Mirrors: `get_unofficial_mirrors`, `get_unofficial_mirror`, `create_unofficial_mirror`, `update_unofficial_mirror`, `delete_unofficial_mirror`
- Official Mirrors: `get_official_mirrors`, `get_official_mirror`
- Tenants: `get_tenants`, `get_tenant`
- Secrets: `get_secrets`, `get_secret`, `create_secret`, `update_secret`, `delete_secret`
- MCP JSONs: `get_mcp_jsons`, `get_mcp_json`, `create_mcp_json`, `update_mcp_json`, `delete_mcp_json`

All new tools follow the established patterns from existing tools with comprehensive TypeScript types, Zod validation, and error handling. The backend REST API endpoints from PR #1799 need to be deployed before these tools can be tested against a live environment.

**Existing tools continue to pass all tests (47/47).**

**Note:** v0.5.0 refactors tool group organization:

- Each group now has two variants: base (e.g., `newsletter`) and readonly (e.g., `newsletter_readonly`)
- New `TOOL_GROUPS` env var (replaces `PULSEMCP_ADMIN_ENABLED_TOOLGROUPS`)
- Mix and match base and readonly groups for different access levels per group

This is an internal refactoring of tool organization - no API changes or functional differences. All tools continue to work identically; only the configuration mechanism has changed. Existing manual tests remain valid as they test tool functionality which is unaffected.

**Note:** v0.4.4 fixes empty validation error messages in `save_mcp_implementation`:

- When the Rails backend returns a 422 with an empty `errors` array, the tool now shows "Unknown validation error" instead of just "Validation failed: " (empty after colon)
- Added support for Rails `error` string format in addition to `errors` array format
- This fix also applied to `create_post`, `update_post`, and email sending error handling

This is an error handling fix verified by 6 new unit tests. The fix changes how error responses are parsed but does not change the expected Rails API behavior. Existing manual tests remain valid as they test successful operations.

**Note:** v0.4.3 fixes empty array handling for `canonical` and `remote` parameters in `save_mcp_implementation`:

- Passing `canonical: []` now correctly sends the empty array marker to Rails, triggering deletion of all canonical URLs
- Passing `remote: []` now correctly sends the empty array marker to Rails, triggering deletion of all remote endpoints
- Previously, empty arrays were being omitted from the API request due to the `length > 0` check

This is a payload construction fix verified by 8 new unit tests. The fix changes how the API payload is constructed but does not change the expected Rails API behavior. Existing manual tests remain valid as they test non-empty array operations which are unaffected.

**Note:** v0.4.2 renames two tool names to prevent exceeding Claude's 64-character limit when combined with long MCP server configuration names:

- `approve_official_mirror_queue_item_without_modifying` → `approve_mirror_no_modify`
- `send_mcp_implementation_posting_notification` → `send_impl_posted_notif`

This is a naming change only - no API changes or functional differences. All existing manual tests remain valid.

All manual tests pass against staging API (`npm run test:manual`). The v0.4.0 release adds support for configurable API base URL via `PULSEMCP_ADMIN_API_URL` environment variable, enabling testing against staging or other environments.

**New Tools Added (Official Mirror Queue):**

- `get_official_mirror_queue_items` - List/filter queue entries ✅ Verified against staging
- `get_official_mirror_queue_item` - Get detailed queue entry ✅ Verified against staging
- `approve_official_mirror_queue_item` - Approve and link to server ✅ Verified against staging
- `approve_mirror_no_modify` - Approve without update ✅ Verified against staging
- `reject_official_mirror_queue_item` - Reject entry ✅ Verified against staging
- `add_official_mirror_to_regular_queue` - Convert to draft ✅ Verified against staging
- `unlink_official_mirror_queue_item` - Unlink from server ✅ Verified against staging

These tools use the same API client patterns, form-encoded POST requests for actions, and error handling as the existing server queue tools. Functional tests (104 tests) verify the tool structure, parameter validation, and output formatting.

### Tool Test Results

1. **Find Providers** (find-providers.manual.test.ts): ✅ 9/9 PASSING
   - searchProviders (4 tests)
   - getProviderById (3 tests)
   - API error handling (1 test)
   - Data consistency (1 test)

2. **Draft MCP Implementations** (server-queue-tools.manual.test.ts): ✅ 17/17 PASSING
   - get_draft_mcp_implementations (5 tests)
   - save_mcp_implementation (8 tests)
   - Tool group filtering (1 test)
   - Associated objects integration (3 tests)

3. **Search MCP Implementations** (search-mcp-implementations.manual.test.ts): ✅ 11/11 PASSING
   - Basic search functionality (3 tests)
   - Filtering and pagination (3 tests)
   - Search result details (1 test)
   - Edge cases (4 tests)

4. **Newsletter Operations** (pulsemcp-cms-admin.manual.test.ts): ✅ 9/9 PASSING
   - Newsletter post operations (7 tests)
   - Error handling (2 tests)

5. **Email Notifications** (send-email.manual.test.ts): ✅ 1/1 PASSING
   - Email sending functionality

## What's New in v0.4.0

### Official Mirror Queue Management Tools

Added 7 new tools for managing the official MCP Registry server.json submissions queue:

**Read-only tools (official_queue_readonly group):**

- `get_official_mirror_queue_items` - List and filter queue entries with pagination and search
- `get_official_mirror_queue_item` - Get detailed information about a single queue entry

**Action tools (official_queue_all group):**

- `approve_official_mirror_queue_item` - Approve and link to existing MCP server (async)
- `approve_mirror_no_modify` - Approve without updating linked server (renamed from `approve_official_mirror_queue_item_without_modifying` in v0.4.2)
- `reject_official_mirror_queue_item` - Reject a queue entry (async)
- `add_official_mirror_to_regular_queue` - Convert to draft MCP implementation (async)
- `unlink_official_mirror_queue_item` - Unlink from linked MCP server

**Note:** These tools follow the same patterns as the existing server queue tools and use the same API client infrastructure. The underlying REST API endpoints were added in pulsemcp/pulsemcp PR #1343.

## What's New in v0.3.3

### Customizable Email Content

Added `content` parameter to `send_impl_posted_notif` (formerly `send_mcp_implementation_posting_notification`) tool for customizing email body content:

- Use `${implementationUrl}` placeholder to insert the link to the live implementation
- Falls back to the default email template when not provided

**Note:** This is a tool parameter addition only - no API changes. The tool already used the `sendEmail` API with a `content` parameter; this change makes that parameter user-customizable instead of hardcoded. All v0.3.2 manual tests remain valid.

## What's New in v0.3.2

### Implementation ID in Search Results

Added the implementation ID to `search_mcp_implementations` results, displayed right after the name/type header. This enables follow-up operations like `save_mcp_implementation` and `send_impl_posted_notif` that require the implementation ID.

**Note:** This is an output formatting change only - no API changes. All v0.3.1 manual tests remain valid.

## What's Fixed in v0.3.1

### Remote/Canonical Persistence Fix

Fixed the Rails nested attributes parameter format for `save_mcp_implementation`:

- Changed `mcp_implementation[remote][0][field]` to `mcp_implementation[remote_attributes][0][field]`
- Changed `mcp_implementation[canonical][0][field]` to `mcp_implementation[canonical_attributes][0][field]`
- Tested and verified against production API: remote and canonical data now persists correctly

## What's New

### find_providers Tool (Added 2025-11-27)

Added comprehensive provider search and retrieval functionality:

**searchProviders**:

- Search providers by name, URL, or slug (case-insensitive)
- Pagination support with limit/offset
- Returns providers with implementation counts and metadata

**getProviderById**:

- Direct retrieval of provider by numeric ID
- Returns null for non-existent providers
- Full provider details including optional fields

#### Test Results Detail

✅ **searchProviders Tests** (4 tests - 4.22s total):

1. Basic search (1523ms): Successfully searched for "anthropic", retrieved 2 providers
2. Pagination (1150ms): Retrieved 5 of 4267 providers with limit=5, validated pagination metadata
3. Empty results (1431ms): Confirmed empty array with proper pagination for non-existent queries
4. Multi-field search (1116ms): Found 3 providers matching "model" across name/url/slug fields

✅ **getProviderById Tests** (3 tests - 9.0s total):

1. Retrieve by ID (2775ms): Retrieved provider ID 1425, verified all fields
2. Non-existent ID (1063ms): Confirmed null return for ID 999999999
3. Multiple retrievals (5159ms): Retrieved 3 providers by ID, verified consistency

✅ **API Error Handling** (1 test - 1348ms):

- Invalid API key: Properly rejected with 401/Invalid API key error

✅ **Data Consistency** (1 test - 2780ms):

- Verified ID, name, slug, url match between search and getById operations

#### Sample API Responses

**Search Response** (query: "anthropic"):

```json
{
  "providers": [
    {
      "id": 1425,
      "name": "Shannon Sands",
      "url": "https://github.com/misanthropic-ai",
      "slug": "gh-misanthropic-ai",
      "mcp_implementations_count": 2,
      "created_at": "2025-03-13T15:45:41.559Z",
      "updated_at": "2025-03-13T15:45:41.559Z"
    },
    {
      "id": 3,
      "name": "Anthropic",
      "url": "https://www.anthropic.com/",
      "slug": "anthropic",
      "mcp_implementations_count": 25,
      "created_at": "2024-12-05T22:04:56.170Z",
      "updated_at": "2024-12-05T22:04:56.170Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 1,
    "total_count": 2,
    "has_next": false,
    "limit": 30
  }
}
```

**GetById Response** (ID 1425):

```json
{
  "id": 1425,
  "name": "Shannon Sands",
  "url": "https://github.com/misanthropic-ai",
  "slug": "gh-misanthropic-ai",
  "mcp_implementations_count": 2,
  "created_at": "2025-03-13T15:45:41.559Z",
  "updated_at": "2025-03-13T15:45:41.559Z"
}
```

## What's New in v0.3.0

### Remote Endpoint Support

Added comprehensive remote endpoint management for MCP implementations:

- `remote`: Array of remote endpoint configurations
  - `id`: ID of existing remote or omit for new
  - `url_direct`: Direct access URL
  - `url_setup`: Setup/documentation URL
  - `transport`: Transport protocol (stdio, sse, etc.)
  - `host_platform`: Hosting platform (npm, pypi, docker, etc.)
  - `host_infrastructure`: Infrastructure type (local, cloud, etc.)
  - `authentication_method`: Auth mechanism
  - `cost`: Pricing tier
  - `status`: Operational status (active, beta, etc.)
  - `display_name`: Human-readable name
  - `internal_notes`: Admin notes

### Canonical URL Support

Added canonical URL management with scoped definitions:

- `canonical`: Array of canonical URL configurations
  - `url`: The canonical URL
  - `scope`: Scope level (domain, subdomain, subfolder, url)
  - `note`: Optional explanatory note

**Important**: The API uses replacement semantics - sending canonical data replaces all existing canonicals.

## Key Functionality Verified

### Remote Endpoint Submission

✅ Successfully tested:

- Creating new remote endpoints with all fields
- Updating existing remotes by ID
- Form data encoding for nested array structures
- Integration with Rails API backend

### Canonical URL Submission

✅ Successfully tested:

- Submitting canonical URLs with different scopes
- Replacement semantics (array replaces existing)
- Optional note field handling
- Proper form data array encoding

### Combined Updates

✅ Successfully tested:

- Updating both remote and canonical data in single operation
- Independent field handling
- No field interference between features

## Environment Configuration

### API Authentication

✅ Production API key working for all operations:

- GET /api/implementations/drafts
- PUT /api/implementations/:id (with remote/canonical)
- All queue and processing operations

## Conclusion

**Status**: ✅ READY FOR RELEASE

All v0.4.0 features tested and working against production API:

1. Remote endpoint submission: ✅ Working
2. Canonical URL submission: ✅ Working
3. Combined updates: ✅ Working
4. Form data encoding: ✅ Correct
5. API integration: ✅ Verified
6. find_providers tool: ✅ Working
7. Implementation ID in search results: ✅ Added (output format change, no API changes)
8. Customizable email content: ✅ Added (tool parameter addition, no API changes)
9. Official mirror queue tools: ✅ Added (7 new tools following existing patterns)

100% of manual tests passing (47/47) with real production data. New official mirror queue tools verified via staging API and comprehensive functional tests (85 tests total).

### Bug Fixes Verified

Previously skipped tests are now passing after API bug fixes:

- ✅ Search with type filter (database + server)
- ✅ Single-character queries
- ✅ Multi-field search (anthropic query)
