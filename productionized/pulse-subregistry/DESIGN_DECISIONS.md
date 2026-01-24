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

**Decision**: Return formatted Markdown for both tools.

**Rationale**:

- Markdown renders nicely in MCP clients like Claude Desktop
- Easier to read than raw JSON
- Follows the pattern used by other PulseMCP servers (e.g., pulse-fetch)

**Alternatives considered**:

- JSON - More structured but harder to read
- Plain text - Less formatting capabilities
- Both (with format parameter) - Added complexity

**Open for discussion**: Should we offer a `format` parameter?

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

**Decision**: Use `PULSEMCP_API_KEY` and `PULSEMCP_TENANT_ID`.

**Rationale**:

- Prefixed with `PULSEMCP_` to avoid conflicts
- Matches the naming pattern from the API documentation
- Clear what they're for

**Alternatives considered**:

- `PULSE_SUBREGISTRY_API_KEY` - Matches server name but longer
- `API_KEY` - Too generic, could conflict

---

## 11. API Response Transformation: Flattening Nested Structure

**Decision**: Transform the nested API response (`{ server: ..., _meta: ... }`) to a flat structure for tools.

**Rationale**:

- The API returns servers as `{ servers: [{ server: {...}, _meta: {...} }, ...] }`
- For tool output, users care about the server data, not the wrapper structure
- Flattening makes the tool output cleaner and more readable
- The `_meta` information (visitor stats, publication info) could be exposed later if needed

**Implementation**:

- `listServers()` extracts `entry.server` from each entry
- `getServer()` returns the full response including `_meta` for potential future use

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

## Summary of Open Questions

1. Should tool names be more explicit (e.g., `list_mcp_servers`)?
2. Should we require explicit version in `get_server`?
3. Should we offer a `format` parameter for output (JSON/Markdown)?
4. Should we add a `list_versions` tool?
5. Should we expose `_meta` information (visitor stats, publication info) in tool output?

Please review these decisions and let me know if any should be changed before merging.
