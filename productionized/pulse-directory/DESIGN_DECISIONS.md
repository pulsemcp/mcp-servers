# Design Decisions

This document tracks potentially controversial design decisions made during the development of the Pulse Directory MCP server. These are meant to be discussed and potentially revised.

## 1. Tool Names: `list_servers` vs `list_mcp_servers`

**Decision**: Use `list_servers` and `get_server` instead of `list_mcp_servers` and `get_mcp_server`.

**Rationale**:

- The server name already indicates it's about MCP servers (`pulse-directory`)
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

**Decision**: Use class-based client (`PulseDirectoryClient`).

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

## 9. Not Implemented: `updated_since` Parameter

**Decision**: Not exposing the `updated_since` parameter from the list servers API.

**Rationale**:

- Less commonly needed for typical browsing use cases
- Adds complexity to the tool interface
- Can be added later if users request it

**Open for discussion**: Should we expose `updated_since` for power users?

---

## 10. Environment Variable Naming

**Decision**: Use `PULSEMCP_API_KEY` and `PULSEMCP_TENANT_ID`.

**Rationale**:

- Prefixed with `PULSEMCP_` to avoid conflicts
- Matches the naming pattern from the API documentation
- Clear what they're for

**Alternatives considered**:

- `PULSE_DIRECTORY_API_KEY` - Matches server name but longer
- `API_KEY` - Too generic, could conflict

---

## Summary of Open Questions

1. Should tool names be more explicit (e.g., `list_mcp_servers`)?
2. Should we require explicit version in `get_server`?
3. Should we offer a `format` parameter for output (JSON/Markdown)?
4. Should we add a `list_versions` tool?
5. Should we expose the `updated_since` parameter?

Please review these decisions and let me know if any should be changed before merging.
