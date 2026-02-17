# Plan: Dynamic `set_refresh_token` Tool

## Design

### Behavior

1. **On startup without a token** (or with an invalid one): The server exposes only `set_refresh_token` tool. Other tools (search_flights, get_search_history) are hidden.
2. **After `set_refresh_token` is called successfully**: The token is validated by calling Cognito. If valid, the server stores it, switches to showing the normal tools (search_flights, get_search_history), and hides `set_refresh_token`. Calls `server.sendToolListChanged()` to notify the client.
3. **When a token becomes invalid** (auth error during tool use): The server switches back to showing only `set_refresh_token`, hides the other tools, and calls `server.sendToolListChanged()`.
4. **On startup with a valid env var token**: Normal tools are shown immediately (same as before). `set_refresh_token` is hidden. If the token later fails, it switches to the `set_refresh_token` mode.

### Key Insight

- `POINTSYEAH_REFRESH_TOKEN` is now **optional** at startup (no more `process.exit(1)`)
- The server always starts, but with different tool sets depending on auth state
- The `set_refresh_token` tool includes instructions on how to obtain the token

## Files to Change

### 1. `shared/src/state.ts` — Add auth state tracking

- Add `authenticated: boolean` and `refreshToken: string | null` to `ServerState`
- Add `setAuthenticated(value: boolean)` and `setRefreshToken(token: string)` setters
- This is the central place to track whether we're in "needs token" or "authenticated" mode

### 2. `shared/src/tools/set-refresh-token.ts` — NEW: the set_refresh_token tool

- Tool description explains how to get the token (the document.cookie snippet)
- Takes `{ refreshToken: string }` as input
- Validates by calling `refreshCognitoTokens(refreshToken)`
- On success: updates state, stores token, returns success message
- On failure: returns error with instructions

### 3. `shared/src/tools.ts` — Dynamic tool registration

- Add `set_refresh_token` to ALL_TOOLS in a new 'admin' group
- Refactor `createRegisterTools` to accept a callback/state object that controls which tools are visible
- The ListTools and CallTool handlers need to dynamically filter based on auth state
- Need a `refreshToolList()` function that re-registers handlers and calls `server.sendToolListChanged()`

### 4. `shared/src/server.ts` — Wire up auth state transitions

- `PointsYeahClient` constructor takes token from state instead of constructor param
- `withAuth` catches token-revoked errors and triggers the tool list switch
- Need a way to communicate back to the tool registration layer that auth failed
- Add an `onAuthFailure` callback that the tool layer can hook into

### 5. `local/src/index.ts` — Make POINTSYEAH_REFRESH_TOKEN optional

- Remove `process.exit(1)` for missing token
- If token is present, seed it into state and try to validate
- If token is absent, start in "needs token" mode
- Pass `server` instance through so tools can call `sendToolListChanged()`

### 6. `shared/src/resources.ts` — Update config resource

- Show auth status (authenticated/needs_token)
- Show whether refresh token is configured

### 7. Test files

- **Functional tests** (`tests/functional/tools.test.ts`): Add tests for set_refresh_token tool, test tool visibility in both modes
- **Integration tests**: Add test for set_refresh_token flow via MCP, test tool list changes
- **Manual tests**: Redesign to work with dynamic token - first call set_refresh_token, then test other tools. Auth-dependent tests should use set_refresh_token first.
- **Functional mock**: No changes needed (already returns mock data)
- **Integration mock**: Update to support set_refresh_token flow

### 8. Documentation

- `CHANGELOG.md`: Add entries under Unreleased
- `README.md`: Update to explain the new flow
- `CLAUDE.md`: Update architecture section

## Implementation Order

1. `state.ts` — Foundation for auth state
2. `set-refresh-token.ts` — New tool
3. `tools.ts` — Dynamic tool registration
4. `server.ts` — Auth failure callback, client factory updates
5. `local/src/index.ts` — Optional token, startup flow
6. `resources.ts` — Config resource updates
7. `index.ts` (shared) — Export updates
8. Functional tests
9. Integration mock + tests
10. Manual tests
11. Docs (CHANGELOG, README, CLAUDE.md)
12. Build, test, lint
13. Version bump to 0.2.0
