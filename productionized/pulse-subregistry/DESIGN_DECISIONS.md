# Design Decisions

This document tracks potentially controversial design decisions made during the development of the Pulse Sub-Registry MCP server. These are meant to be discussed and potentially revised.

## 1. Tool Names: `list_servers` vs `list_mcp_servers`

**Decision**: Use `list_servers` and `get_server` instead of `list_mcp_servers` and `get_mcp_server`.

**Rationale**:

- The server name already indicates it's about MCP servers (`pulse-subregistry`)
- Shorter names are easier to type and remember
- Follows the pattern of other MCP servers that use domain-specific short names

**Alternatives considered**:

- `list_mcp_servers` / `get_mcp_server` - More explicit but redundant
- `browse` / `show` - Too generic
- `search_servers` / `fetch_server` - Different verbs

**Open for discussion**: Should we use longer, more explicit names?

---

## 2. Default Version: "latest" vs Requiring Explicit Version

**Decision**: Default to `version: "latest"` in `get_server` tool.

**Rationale**:

- Most users want the latest version
- Reduces friction for common use case
- API supports "latest" as a valid version specifier

**Alternatives considered**:

- Require explicit version - More precise but less user-friendly
- No version parameter (always latest) - Less flexible

**Open for discussion**: Should we require explicit version specification?

---

## 3. Search Implementation: Client-side vs API-side

**Decision**: Pass search directly to the API.

**Rationale**:

- The API supports search natively
- More efficient than fetching all servers and filtering client-side
- Consistent with pagination behavior

**Note**: In the mock for integration tests, we implement client-side filtering to simulate the API behavior.

---

## 4. Output Format: Markdown vs JSON vs Plain Text

**Decision**: Return raw JSON for both tools.

**Rationale**:

- This is a technical tool for debugging and investigating server configurations
- Users often need to inspect the exact data shapes returned by the API
- JSON preserves all fields and structure for detailed investigation
- Makes it easier to compare API responses and troubleshoot issues

**Alternatives considered**:

- Markdown - More readable but loses structural information
- Plain text - Less formatting capabilities
- Both (with format parameter) - Added complexity

---

## 5. Error Handling: Detailed vs Generic Messages

**Decision**: Include specific error details (API status, error message) in error responses.

**Rationale**:

- Helps users understand what went wrong
- Aids debugging (e.g., authentication issues, rate limits)
- Follows pulse-fetch pattern

**Example**: "Authentication failed: Invalid API key" instead of just "Error"

---

## 6. Pagination: Cursor-based vs Offset-based

**Decision**: Use cursor-based pagination (matching the API).

**Rationale**:

- API provides cursor-based pagination
- More efficient for large datasets
- Consistent results even when data changes

**Trade-off**: Users can't jump to a specific page, must iterate through cursors.

---

## 7. API Client Architecture: Class vs Functions

**Decision**: Use class-based client (`PulseSubregistryClient`).

**Rationale**:

- Encapsulates configuration (API key, base URL)
- Easier to mock in tests
- Follows pattern from pulse-fetch and experimental servers

**Alternatives considered**:

- Standalone functions - Simpler but harder to configure
- Factory functions - Could work but classes are clearer

---

## 8. Not Implemented: `list_versions` Tool

**Decision**: Not implementing a separate `list_versions` tool in the initial version.

**Rationale**:

- `get_server` with `version: "latest"` covers the most common use case
- Reduces complexity for the initial release
- Can be added later if users request it

**API Support**: The API does have a `/servers/{name}/versions` endpoint that could be used.

**Open for discussion**: Should we add a `list_versions` tool?

---

## 9. `updated_since` Parameter

**Decision**: Expose the `updated_since` parameter in the `list_servers` tool.

**Rationale**:

- Allows power users to filter for recently updated servers
- Useful for monitoring new additions to the registry
- Matches the API capability

**Usage**: Pass an ISO 8601 timestamp (e.g., `"2024-01-01T00:00:00Z"`) to filter servers updated after that date.

---

## 10. Environment Variable Naming

**Decision**: Use `PULSEMCP_SUBREGISTRY_API_KEY` and `PULSEMCP_SUBREGISTRY_TENANT_ID`.

**Rationale**:

- Prefixed with `PULSEMCP_SUBREGISTRY_` to clearly identify the server they belong to
- Avoids conflicts with other PulseMCP servers that might use similar credentials
- Clear what they're for and which server uses them

**Alternatives considered**:

- `PULSEMCP_API_KEY` - Shorter but could conflict with other PulseMCP servers
- `API_KEY` - Too generic, could conflict

---

## 11. API Response: Preserving Full Structure with `_meta`

**Decision**: Return the full API response structure including `_meta` information for all tools.

**Rationale**:

- The API returns servers as `{ servers: [{ server: {...}, _meta: {...} }, ...] }`
- The `_meta` information (visitor stats, publication info, timestamps) is valuable for debugging
- Users need access to this metadata for troubleshooting and investigating server configurations
- Preserving the full structure makes it easier to understand the exact API response shape

**Implementation**:

- `listServers()` returns full entries with both `server` and `_meta` fields
- `getServer()` returns the full response including `_meta`

---

## 12. Display Names: Server Title vs ID

**Decision**: Display server `title` as the primary name, with `name` (ID) shown separately.

**Rationale**:

- The API returns both `title` (human-friendly, e.g., "Context7") and `name` (ID, e.g., "io.github.upstash/context7")
- Using `title` for display provides better readability
- Showing the `name` as an ID helps users reference servers in API calls

**Example output**:

```
## Context7
**ID**: `io.github.upstash/context7`
```

---

## 13. Field Exclusion: `exclude_fields` Parameter

**Decision**: Add an `exclude_fields` parameter to both tools that accepts an array of dot-notation paths to exclude from the response.

**Rationale**:

- API responses can be large and consume significant context in LLM conversations
- Users often only need specific fields (e.g., name and description, not packages or remotes)
- Flexible dot-notation with array support (`servers[].server.packages`) allows precise control
- Reduces token usage without requiring multiple tool variations

**Implementation**:

- Accepts an array of strings using dot-notation paths
- Supports `[]` notation to apply exclusions to all array elements (e.g., `"servers[].server.packages"`)
- Deep clones response before filtering to avoid mutation
- Examples:
  - `["servers[]._meta"]` - Remove `_meta` from all servers in list
  - `["server.packages", "server.remotes"]` - Remove packages and remotes from get_server
  - `["_meta"]` - Remove top-level `_meta`

---

## Summary of Open Questions

1. Should tool names be more explicit (e.g., `list_mcp_servers`)?
2. Should we require explicit version in `get_server`?
3. Should we add a `list_versions` tool?

Please review these decisions and let me know if any should be changed before merging.
