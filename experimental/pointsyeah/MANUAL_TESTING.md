# Manual Testing Results

## Test Run

- **Commit:** 7a179dd
- **Date:** 2026-02-16
- **Result:** 16/16 tests passed (100%)
- **Duration:** ~131 seconds

## Test Categories and Results

### Tool & Resource Discovery (3 tests - all pass)

- Lists all 7 tools correctly
- Lists the config resource
- Config resource reports correct version (0.1.0), Playwright availability, and token status

### Authentication - Cognito Token Refresh (1 test - pass)

- Successfully refreshes Cognito tokens and calls the membership API
- First call may fail transiently during MCP subprocess warmup; retry succeeds

### Read-Only Tools - User API (3 tests - all pass)

- `get_search_history`: Returns 5 search history entries with filter/route/date details
- `get_user_membership`: Returns `{code: 0, success: true, data: {status: false}}`
- `get_user_preferences`: Returns preferences including airline programs, banks, cabins, favorite airports

### Read-Only Tools - Explorer API (4 tests - all pass)

- `get_explorer_count`: Returns 9,914,233 available deals
- `get_flight_recommendations` (no filter): Returns 9 routes (e.g., BOS -> SJU via DL for 8,800 miles)
- `get_flight_recommendations` (SFO filter): API returns 500 - departure filter via POST body not supported by backend. Test handles this gracefully.
- `get_hotel_recommendations`: Returns 9 hotel properties (e.g., Six Senses Douro Valley)

### Flight Search - Input Validation (3 tests - all pass)

- Rejects round-trip searches without returnDate
- Rejects invalid date formats
- Rejects missing required fields (departure, arrival, departDate)

### Direct Client - Cognito Auth (1 test - pass)

- Directly calls `refreshCognitoTokens()` with real refresh token
- Returns valid ID token (1218 chars), access token (1072 chars)
- Token expiry correctly set ~1 hour in the future

### Direct Client - Flight Search via Playwright (1 test - pass)

- Creates search task via Playwright browser automation (task ID: 37131cab42ab419c97bbc9db810b511d)
- Task created with 16 sub-tasks
- First poll returned 17 results
- Polling endpoint uses `{result, status}` format (not `{completed_sub_tasks, total_sub_tasks}` as typed)
- Task expires with 404 after ~2 minutes; last successful response: `{code:0, success:true, data:{result:[], status:"done"}}`

## Key Findings

1. **API Response Format Discovery**: The `fetch_result` polling endpoint returns `{result, status}` in `data`, not `{completed_sub_tasks, total_sub_tasks}` as the TypeScript types assume. Results are returned incrementally per poll (not accumulated). The `FlightSearchResponse` type in `types.ts` should be updated to match the real API.

2. **Flight Recommendations Departure Filter**: The `explorer/recommend` POST endpoint returns 500 when a departure parameter is passed in the body. The departure filter feature may need a different API path or query parameter format.

3. **MCP Subprocess Warmup**: The first tool call after connecting the MCP client sometimes fails with `fetch failed`. This is a transient issue during subprocess initialization. A retry with 5s delay resolves it.

4. **MCP Protocol Timeout**: The MCP SDK has a hardcoded 60-second request timeout that cannot be overridden through `TestMCPClient`. Flight searches (which take 1-3 minutes) must be tested by calling the client library directly rather than through the MCP protocol.

5. **Hotel Points Format**: Some hotel recommendations have `points` as an object rather than a number, depending on the hotel program's pricing structure.
