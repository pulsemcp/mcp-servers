import { MonarchAuthError } from '../monarch-client/graphql-transport.js';

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

export function ok(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

export function okJSON(value: unknown): ToolResult {
  return ok(JSON.stringify(value, null, 2));
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
