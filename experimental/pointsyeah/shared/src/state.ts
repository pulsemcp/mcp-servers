/**
 * Server state management for PointsYeah MCP server.
 */

interface ServerState {
  /** Whether the server has been initialized */
  initialized: boolean;
}

let state: ServerState = {
  initialized: false,
};

export function getServerState(): Readonly<ServerState> {
  return { ...state };
}

export function setInitialized(value: boolean): void {
  state.initialized = value;
}

export function resetState(): void {
  state = {
    initialized: false,
  };
}
