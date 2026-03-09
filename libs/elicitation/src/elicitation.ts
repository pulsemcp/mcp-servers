import { randomUUID } from 'node:crypto';
import type {
  ElicitationConfig,
  ElicitationMeta,
  ElicitationPollResponse,
  ElicitationPostResponse,
  ElicitationRequestedSchema,
  ElicitationResult,
  MCPServerLike,
  RequestConfirmationOptions,
} from './types.js';
import { readElicitationConfig } from './config.js';

/**
 * Checks whether the connected client supports native form elicitation.
 */
function clientSupportsElicitation(server: MCPServerLike): boolean {
  const caps = server.getClientCapabilities();
  if (!caps?.elicitation) {
    return false;
  }
  // If elicitation is declared at all (even empty {}), form mode is supported
  // per the MCP spec's backward compatibility rules.
  return true;
}

/**
 * Attempts native elicitation via the MCP SDK's `server.elicitInput()`.
 */
async function nativeElicit(
  server: MCPServerLike,
  message: string,
  requestedSchema: ElicitationRequestedSchema
): Promise<ElicitationResult> {
  const params = {
    mode: 'form' as const,
    message,
    requestedSchema,
  };
  const result = await server.elicitInput(params);

  return {
    action: result.action,
    content: result.content ?? undefined,
  };
}

/**
 * Posts an elicitation request to the HTTP fallback endpoint.
 */
async function postElicitationRequest(
  config: ElicitationConfig,
  message: string,
  requestedSchema: ElicitationRequestedSchema,
  meta: ElicitationMeta
): Promise<ElicitationPostResponse> {
  const response = await fetch(config.requestUrl!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'form',
      message,
      requestedSchema,
      _meta: meta,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Elicitation POST failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
    );
  }

  const data = (await response.json()) as ElicitationPostResponse;
  return data;
}

/**
 * Polls the HTTP fallback endpoint until the request is resolved or expires.
 */
async function pollElicitationStatus(
  config: ElicitationConfig,
  requestId: string,
  expiresAt: number
): Promise<ElicitationResult> {
  const pollUrl = config.pollUrl!.endsWith('/')
    ? `${config.pollUrl}${requestId}`
    : `${config.pollUrl}/${requestId}`;

  while (Date.now() < expiresAt) {
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Elicitation poll failed: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
      );
    }

    const data = (await response.json()) as ElicitationPollResponse;

    if (data.action !== 'pending') {
      return {
        action: data.action,
        content: data.content ?? undefined,
      };
    }

    // Wait before polling again
    await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
  }

  return { action: 'expired' };
}

/**
 * Requests user confirmation through the best available mechanism.
 *
 * Decision tree:
 * 1. If elicitation is disabled (`ELICITATION_ENABLED=false`), returns `accept` immediately.
 * 2. If the client supports native elicitation, uses `server.elicitInput()`.
 * 3. If HTTP fallback URLs are configured, posts to the external endpoint and polls.
 * 4. Otherwise, throws an error indicating no elicitation mechanism is available.
 *
 * @param options - Configuration for the confirmation request.
 * @param config - Elicitation config (defaults to reading from env vars).
 * @returns The user's response.
 */
export async function requestConfirmation(
  options: RequestConfirmationOptions,
  config?: ElicitationConfig
): Promise<ElicitationResult> {
  const cfg = config ?? readElicitationConfig();

  // Tier 1: Disabled — skip confirmation entirely
  if (!cfg.enabled) {
    return { action: 'accept' };
  }

  // Tier 2: Native elicitation
  if (clientSupportsElicitation(options.server)) {
    return nativeElicit(options.server, options.message, options.requestedSchema);
  }

  // Tier 3: HTTP fallback
  if (cfg.requestUrl && cfg.pollUrl) {
    const clientRequestId = randomUUID();
    const expiresAt = Date.now() + cfg.ttlMs;

    const meta: ElicitationMeta = {
      'com.pulsemcp/request-id': clientRequestId,
      'com.pulsemcp/expires-at': new Date(expiresAt).toISOString(),
      ...(cfg.sessionId && { 'com.pulsemcp/session-id': cfg.sessionId }),
      ...options.meta,
    };

    const postResponse = await postElicitationRequest(
      cfg,
      options.message,
      options.requestedSchema,
      meta
    );
    // Use the server-provided requestId if available, otherwise fall back to the client-generated one
    const requestId = postResponse.requestId || clientRequestId;
    return pollElicitationStatus(cfg, requestId, expiresAt);
  }

  // Tier 4: No mechanism available
  throw new Error(
    'Elicitation is enabled but no mechanism is available. ' +
      'Either the client must support native elicitation, or ' +
      'ELICITATION_REQUEST_URL and ELICITATION_POLL_URL must be configured for HTTP fallback.'
  );
}

/**
 * Creates a simple boolean confirmation schema for common "are you sure?" prompts.
 */
export function createConfirmationSchema(
  title: string = 'Confirm',
  description?: string
): ElicitationRequestedSchema {
  return {
    type: 'object',
    properties: {
      confirm: {
        type: 'boolean',
        title,
        ...(description ? { description } : {}),
      },
    },
    required: ['confirm'],
  };
}
