import { MonarchAuthError } from '../monarch-client/graphql-transport.js';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

/**
 * Serialize a value as the tool's text result.
 *
 * Uses compact JSON (no pretty-print indentation). The data is identical to
 * indented output, but list-heavy responses like `get_transactions` are far
 * smaller on the wire — a ~222-transaction page dropped from ~134 KB to roughly
 * half that. Consumers parse the payload rather than reading it raw, so the
 * whitespace carried no value.
 */
export function okJSON(value: unknown): ToolResult {
  return ok(JSON.stringify(value));
}

export function errorResult(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true };
}

export const AUTH_HINT =
  'Not authenticated with Monarch Money. Run the login script (`npm run login` from the server package, ' +
  'or `node scripts/login.js`) to obtain a session token, or call `monarch_login_with_token` with a ' +
  'pre-obtained token.';

/**
 * Convert a thrown error into a user-facing tool result. Auth errors get a
 * dedicated hint pointing at the login flow; everything else is surfaced
 * verbatim so the user can see Monarch's GraphQL message.
 */
export function errorFromException(err: unknown): ToolResult {
  if (err instanceof MonarchAuthError) return errorResult(AUTH_HINT);
  const message = err instanceof Error ? err.message : String(err);
  return errorResult(`Monarch Money error: ${message}`);
}
