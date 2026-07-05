# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.2] - 2026-07-05

### Changed

- Renamed the npm package to **`tailscale-vpn-mcp-server`** for its initial public publish. The bare `tailscale-mcp-server` name is owned by an unrelated third party on npm, so a non-colliding name is required. The new name follows the repo's unscoped `<service>-<qualifier>-mcp-server` convention (e.g. `langfuse-observability-mcp-server`, `vercel-platform-mcp-server`). Installation is now `npx -y tailscale-vpn-mcp-server`. The MCP registry name (`com.pulsemcp/tailscale`) is unchanged.
- Set `publishConfig.access: public`, matching the other published servers in this repo.

## [0.0.1] - 2026-07-05

### Added

- Initial release of the Tailscale MCP Server, wrapping the [Tailscale REST API v2](https://tailscale.com/api).
- **Policy (ACL) tools** (`policy` / `policy_readonly` group) — the headline capability:
  - `get_policy_file` — fetch the tailnet policy file (HuJSON) with its ETag.
  - `validate_policy_file` — validate a proposed policy against the tailnet without applying it.
  - `update_policy_file` — replace the tailnet policy file, with optional ETag/`If-Match` optimistic concurrency.
- **Device tools** (`devices` / `devices_readonly` group):
  - `list_devices`, `get_device`, `get_device_routes` (read).
  - `authorize_device`, `set_device_tags`, `set_device_routes`, `delete_device` (write).
- **Auth-key tools** (`keys` / `keys_readonly` group):
  - `list_keys`, `get_key` (read).
  - `create_auth_key`, `delete_key` (write).
- Tool-group gating via the `TOOL_GROUPS` environment variable, with a base (read + write) and `_readonly` variant per group. Defaults to all base groups.
- Authentication via `TAILSCALE_API_KEY` (Bearer) or an OAuth client (`TAILSCALE_OAUTH_CLIENT_ID` + `TAILSCALE_OAUTH_CLIENT_SECRET`, client-credentials flow). Configurable `TAILSCALE_TAILNET` (default `-`) and `TAILSCALE_API_URL`.
- Functional, integration (mocked MCP protocol flow), and read-only e2e (live, credential-guarded) test suites.
