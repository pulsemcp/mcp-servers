/**
 * Server state management for PointsYeah MCP server.
 */

interface ServerState {
  /** Whether Playwright is available for flight searches */
  playwrightAvailable: boolean;
}

let state: ServerState = {
  playwrightAvailable: false,
};

export function getServerState(): Readonly<ServerState> {
  return { ...state };
}

export function setPlaywrightAvailable(available: boolean): void {
  state.playwrightAvailable = available;
}

export function resetState(): void {
  state = {
    playwrightAvailable: false,
  };
}
