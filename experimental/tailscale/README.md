# Tailscale MCP Server

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server for administering a [Tailscale](https://tailscale.com/) tailnet. It wraps the [Tailscale REST API v2](https://tailscale.com/api) to give agents read-only introspection of a tailnet plus autonomous control over its **policy file (ACLs)**, devices, and auth keys.

The headline capability is **policy configuration**: an agent can fetch the current tailnet policy file, validate a proposed policy without applying it, and replace the policy file — enabling closed-loop, autonomous ACL management.

**Note**: This server talks to a live Tailscale tailnet and requires an API access token or an OAuth client. Write tools mutate real infrastructure — see [Tool Groups](#tool-groups) for how to restrict the server to read-only access.

# Table of Contents

- [Highlights](#highlights)
- [Capabilities](#capabilities)
- [Tool Groups](#tool-groups)
  - [Available Groups](#available-groups)
  - [Tools by Group](#tools-by-group)
  - [Environment Variables](#environment-variables)
  - [Examples](#examples)
- [Usage Tips](#usage-tips)
- [Setup](#setup)
  - [Authentication](#authentication)
  - [Claude Desktop](#claude-desktop)
- [Development](#development)
- [License](#license)

# Highlights

**Policy (ACL) Configuration**: Fetch, validate, and replace the tailnet policy file. Validation runs server-side against the live tailnet before you commit, and updates use optimistic concurrency (ETag / `If-Match`) so you never clobber a policy that changed underneath you.

**Device Management**: List and inspect devices, read and set their advertised/enabled subnet routes, authorize/deauthorize nodes, retag them, and remove them from the tailnet.

**Auth Key Management**: List and inspect auth keys and API access tokens, mint new (reusable, ephemeral, preauthorized, or tagged) auth keys, and revoke keys.

**Tool Groups**: Enable/disable tool groups via the `TOOL_GROUPS` environment variable. Each group has a base variant (full read + write access) and a `_readonly` variant (read-only access), so you can hand an agent exactly the surface area you're comfortable with.

**Flexible Auth**: Authenticate with a Tailscale API access token or with an OAuth client (client-credentials flow), which the server exchanges for a short-lived access token automatically.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name              | Tool Group | Read/Write | Description                                                           |
| ---------------------- | ---------- | ---------- | --------------------------------------------------------------------- |
| `get_policy_file`      | policy     | read       | Get the tailnet policy file (ACLs) as HuJSON, with its ETag.          |
| `validate_policy_file` | policy     | read       | Validate a proposed policy file against the tailnet without applying. |
| `update_policy_file`   | policy     | write      | Replace the tailnet policy file (ACLs).                               |
| `list_devices`         | devices    | read       | List devices (nodes) in the tailnet.                                  |
| `get_device`           | devices    | read       | Get detailed information about a single device.                       |
| `get_device_routes`    | devices    | read       | Get the advertised and enabled subnet routes for a device.            |
| `authorize_device`     | devices    | write      | Authorize or deauthorize a device.                                    |
| `set_device_tags`      | devices    | write      | Set the ACL tags on a device.                                         |
| `set_device_routes`    | devices    | write      | Set the enabled subnet routes for a device.                           |
| `delete_device`        | devices    | write      | Remove a device from the tailnet.                                     |
| `list_keys`            | keys       | read       | List auth keys and API access tokens for the tailnet.                 |
| `get_key`              | keys       | read       | Get metadata about a single auth key or API access token.             |
| `create_auth_key`      | keys       | write      | Create a new auth key (returns the secret exactly once).              |
| `delete_key`           | keys       | write      | Revoke (delete) an auth key or API access token.                      |

# Tool Groups

This server organizes tools into groups that can be selectively enabled or disabled. Each group has two variants:

- **Base group** (e.g., `policy`): Full read + write access
- **Readonly group** (e.g., `policy_readonly`): Read-only access

## Available Groups

| Group              | Tools | Description                             |
| ------------------ | ----- | --------------------------------------- |
| `policy`           | 3     | Full policy-file access (read + write)  |
| `policy_readonly`  | 2     | Policy read + validate (read only)      |
| `devices`          | 7     | Full device management (read + write)   |
| `devices_readonly` | 3     | Device inspection (read only)           |
| `keys`             | 4     | Full auth-key management (read + write) |
| `keys_readonly`    | 2     | Auth-key inspection (read only)         |

### Tools by Group

- **policy** / **policy_readonly**:
  - Read-only: `get_policy_file`, `validate_policy_file`
  - Write: `update_policy_file`
- **devices** / **devices_readonly**:
  - Read-only: `list_devices`, `get_device`, `get_device_routes`
  - Write: `authorize_device`, `set_device_tags`, `set_device_routes`, `delete_device`
- **keys** / **keys_readonly**:
  - Read-only: `list_keys`, `get_key`
  - Write: `create_auth_key`, `delete_key`

## Environment Variables

| Variable                        | Description                                                          | Default                            |
| ------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| `TAILSCALE_API_KEY`             | Tailscale API access token (Bearer). Required unless using OAuth.    | -                                  |
| `TAILSCALE_OAUTH_CLIENT_ID`     | OAuth client ID. Required (with the secret) unless using an API key. | -                                  |
| `TAILSCALE_OAUTH_CLIENT_SECRET` | OAuth client secret. Required (with the ID) unless using an API key. | -                                  |
| `TAILSCALE_TAILNET`             | Tailnet to operate on. Use `-` for the default tailnet of the token. | `-`                                |
| `TAILSCALE_API_URL`             | Base URL for the Tailscale API (include the `/api/v2` path).         | `https://api.tailscale.com/api/v2` |
| `TOOL_GROUPS`                   | Comma-separated list of enabled tool groups.                         | `policy,devices,keys` (all base)   |

Provide **either** `TAILSCALE_API_KEY` **or** both `TAILSCALE_OAUTH_CLIENT_ID` and `TAILSCALE_OAUTH_CLIENT_SECRET`. If both an API key and an OAuth client are set, the API key takes precedence.

## Examples

Enable all tools with full access (default):

```bash
# No TOOL_GROUPS needed - all base groups enabled
```

Enable only policy tools (the headline capability):

```bash
TOOL_GROUPS=policy
```

Give an agent full policy control but read-only visibility into devices and keys:

```bash
TOOL_GROUPS=policy,devices_readonly,keys_readonly
```

Lock the whole server down to read-only:

```bash
TOOL_GROUPS=policy_readonly,devices_readonly,keys_readonly
```

# Usage Tips

- Start with `get_policy_file` to fetch the current policy **and its ETag**, edit the HuJSON, run `validate_policy_file` to catch mistakes server-side, then apply with `update_policy_file`. Passing the ETag from the read into the update makes the write fail safely (HTTP 412) if someone else changed the policy in the meantime.
- The policy file is [HuJSON](https://tailscale.com/kb/1018/acls) (JSON with comments and trailing commas). Preserve comments when editing — they document intent for the humans who share the tailnet.
- `create_auth_key` returns the key secret **exactly once**. Capture it immediately; it cannot be retrieved again.
- Use `TOOL_GROUPS` to scope autonomy: hand an agent `policy` when its job is ACL management, and add `_readonly` device/key groups only for the context it needs to reason about the change.
- Device IDs (not hostnames) identify devices in write calls. Use `list_devices` to map a hostname to its stable ID.

# Setup

## Authentication

You need one of:

1. A **Tailscale API access token** — create one under [admin console → Settings → Keys](https://login.tailscale.com/admin/settings/keys). Set it as `TAILSCALE_API_KEY`.
2. An **OAuth client** — create one under [admin console → Settings → OAuth clients](https://login.tailscale.com/admin/settings/oauth) with the scopes matching the tool groups you plan to enable (e.g. `policy_file`, `devices`, `auth_keys`). Set `TAILSCALE_OAUTH_CLIENT_ID` and `TAILSCALE_OAUTH_CLIENT_SECRET`.

## Claude Desktop

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "tailscale": {
      "command": "npx",
      "args": ["-y", "tailscale-vpn-mcp-server"],
      "env": {
        "TAILSCALE_API_KEY": "tskey-api-your-token-here",
        "TOOL_GROUPS": "policy,devices,keys"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

For read-only access:

```json
{
  "mcpServers": {
    "tailscale-readonly": {
      "command": "npx",
      "args": ["-y", "tailscale-vpn-mcp-server"],
      "env": {
        "TAILSCALE_API_KEY": "tskey-api-your-token-here",
        "TOOL_GROUPS": "policy_readonly,devices_readonly,keys_readonly"
      }
    }
  }
}
```

Using an OAuth client instead of an API key:

```json
{
  "mcpServers": {
    "tailscale": {
      "command": "npx",
      "args": ["-y", "tailscale-vpn-mcp-server"],
      "env": {
        "TAILSCALE_OAUTH_CLIENT_ID": "your-client-id",
        "TAILSCALE_OAUTH_CLIENT_SECRET": "your-client-secret",
        "TOOL_GROUPS": "policy"
      }
    }
  }
}
```

# Development

This server lives in the internal `mcp-servers/` development harness. From `mcp-servers/`:

```bash
# Install workspace dependencies
npm install

# Build the server (shared, then local)
(cd servers/tailscale/shared && npm run build)
(cd servers/tailscale/local && npm run build)

# Type-check and lint (run from mcp-servers/ root)
npm run typecheck
npm run lint

# Run functional + integration tests
cd servers/tailscale && npx vitest run                                  # functional
cd servers/tailscale && npx vitest run -c vitest.config.integration.ts  # integration
```

E2E tests (`tests/e2e/`) run against a live tailnet and are **skipped automatically** when no credential is present. To run them, provide a `TAILSCALE_API_KEY` (or OAuth client) via the encrypted credentials workflow described in [mcp-servers/CLAUDE.md](../../CLAUDE.md), then:

```bash
cd servers/tailscale && npx vitest run -c vitest.config.e2e.ts
```

The e2e suite is read-only by design — it forces read-only tool groups so a live run can never mutate the tailnet.

## License

MIT
