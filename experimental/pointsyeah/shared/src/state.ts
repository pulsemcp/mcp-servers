/**
 * Server state management for PointsYeah MCP server.
 */

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ServerState {}

let state: ServerState = {};

export function getServerState(): Readonly<ServerState> {
  return { ...state };
}

export function resetState(): void {
  state = {};
}
