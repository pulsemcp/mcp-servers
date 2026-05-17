# Publishing to the Official MCP Registry

This repo publishes server manifests (`server.json`) to the
[official MCP Registry](https://modelcontextprotocol.io/registry/about) under
the `com.pulsemcp/<server-name>` namespace.

## How it works

`.github/workflows/publish-mcp-registry.yml` runs on every push to `main`
that touches a `server.json`, the root `README.md`, or the workflow itself.
It can also be invoked manually via the **Actions** tab (with an optional
`dry_run` toggle).

For each push, the workflow:

1. Walks every `experimental/*/server.json` and `productionized/*/server.json`.
2. Reads the **MCP Registry** column from the root `README.md` table.
   - `Yes` — eligible to publish.
   - `No` — never publish (e.g. internal-only servers).
   - Missing / unrecognized — fails the workflow so we don't accidentally
     publish or accidentally skip.
3. Queries the registry's `GET /v0/servers/{name}/versions/latest` for the
   current published version.
4. If the local `server.json` version doesn't match the registry version
   (or the server is unpublished), enqueues it for publishing.
5. Authenticates to the registry using DNS-based proof for `pulsemcp.com`
   (see [Secrets and DNS](#secrets-and-dns) below) and runs
   `mcp-publisher publish <server.json>` for each candidate.

The workflow is idempotent — if a publish fails or a step needs to be retried,
re-running the workflow on the same SHA is safe. Candidates whose version
already matches the registry are simply skipped.

## Adding a new server

A new `server.json` is published the first time it appears on `main` and the
README row has `MCP Registry: Yes`. To bump the version, change the
`version` field in `server.json` (and `packages[0].version` if it tracks the
npm package version) and push — the workflow will pick it up on the next
push to `main`.

## Secrets and DNS

Publishing under `com.pulsemcp/*` uses DNS-based authentication, which means
the registry verifies a TXT record on `pulsemcp.com` against a private key
held in this repo's secrets.

| Item                                     | Where                                              | Notes                                                            |
| ---------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------- |
| Public key (TXT record)                  | Cloudflare DNS, `pulsemcp.com` apex                | `v=MCPv1; k=ed25519; p=<base64-public-key>`                      |
| Private key (`MCP_REGISTRY_PRIVATE_KEY`) | GitHub repository secret on `pulsemcp/mcp-servers` | Ed25519 private key, hex-encoded (no `0x` prefix, no whitespace) |

> **Note:** A second TXT record on `servers.pulsemcp.com` exists for the
> legacy `com.pulsemcp.servers/*` namespace (used by `com.pulsemcp.servers/pulse-fetch`).
> Leave it in place — removing it would prevent updates to that legacy entry.

### Rotating the key

If the private key is ever compromised:

1. Generate a fresh Ed25519 keypair:

   ```bash
   openssl genpkey -algorithm Ed25519 -out key.pem
   PUBLIC_KEY="$(openssl pkey -in key.pem -pubout -outform DER | tail -c 32 | base64)"
   PRIVATE_KEY="$(openssl pkey -in key.pem -noout -text | grep -A3 "priv:" | tail -n +2 | tr -d ' :\n')"
   echo "TXT record: v=MCPv1; k=ed25519; p=$PUBLIC_KEY"
   echo "Private key (hex): $PRIVATE_KEY"
   ```

2. Update the TXT record on `pulsemcp.com` to the new public key.
3. Update the `MCP_REGISTRY_PRIVATE_KEY` repository secret with the new private key.
4. Wait for DNS propagation (a few minutes), then re-run the workflow.
