import http from 'node:http';
import https from 'node:https';

/**
 * Force outbound HTTP(S) connections to open a fresh socket per request
 * (`Connection: close`) instead of reusing a pooled keep-alive socket.
 *
 * Node 19+ defaults the global agent to `keepAlive: true`. The Google Cloud
 * Storage SDK's auth path (`google-auth-library` -> `gtoken` -> `gaxios` ->
 * `node-fetch` 2.x) reuses those pooled sockets for the OAuth token exchange
 * against `https://www.googleapis.com/oauth2/v4/token`. When a middlebox in the
 * egress path resets a keep-alive connection, node-fetch 2.x surfaces it as
 * `ERR_STREAM_PREMATURE_CLOSE` ("Invalid response body ... Premature close")
 * and the entire GCS operation fails. The failure is deterministic per request,
 * not a transient blip, so the application-level retry wrapper cannot self-heal
 * it — every attempt rides the same poisoned keep-alive path and fails identically.
 *
 * gtoken builds its own `gaxios` instance with no per-client agent hook
 * (`GoogleAuth`'s `transporterOptions.agent` does not reach it), so the only
 * reliable place to disable keep-alive for the token exchange is the
 * process-global agent that `node-fetch` falls back to. This server's sole
 * outbound traffic is to GCS, so scoping the change to the global agent is
 * effectively scoped to GCS.
 *
 * Idempotent: checks the current agent state, so it is safe to call from every
 * {@link GCSClient} construction.
 */
export function disableHttpKeepAlive(): void {
  if (keepAliveOption(https.globalAgent) !== false) {
    https.globalAgent = new https.Agent({ keepAlive: false });
  }
  if (keepAliveOption(http.globalAgent) !== false) {
    http.globalAgent = new http.Agent({ keepAlive: false });
  }
}

/**
 * Reads the `keepAlive` option off an agent. `@types/node` does not expose the
 * `options` property on `Agent`, so this narrows through a typed view rather
 * than `any`.
 */
function keepAliveOption(agent: http.Agent): boolean | undefined {
  return (agent as http.Agent & { options?: http.AgentOptions }).options?.keepAlive;
}
