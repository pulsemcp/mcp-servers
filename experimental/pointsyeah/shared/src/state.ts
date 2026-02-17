/**
 * Server state management for PointsYeah MCP server.
 *
 * Tracks authentication state and the current refresh token.
 * When authenticated is false, auth-requiring tools return an error
 * directing users to call set_refresh_token.
 */

interface ServerState {
  authenticated: boolean;
  refreshToken: string | null;
}

let state: ServerState = {
  authenticated: false,
  refreshToken: null,
};

export function getServerState(): Readonly<ServerState> {
  return { ...state };
}

export function setAuthenticated(value: boolean): void {
  state.authenticated = value;
}

export function setRefreshToken(token: string): void {
  state.refreshToken = token;
}

export function clearRefreshToken(): void {
  state.refreshToken = null;
}

export function resetState(): void {
  state = {
    authenticated: false,
    refreshToken: null,
  };
}
