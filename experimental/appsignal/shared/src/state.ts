// State management for the AppSignal MCP server

// In-memory state to store the selected app ID
let selectedAppId: string | undefined = undefined;

export function getSelectedAppId(): string | undefined {
  return selectedAppId;
}

export function setSelectedAppId(appId: string): void {
  selectedAppId = appId;
}

export function clearSelectedAppId(): void {
  selectedAppId = undefined;
}