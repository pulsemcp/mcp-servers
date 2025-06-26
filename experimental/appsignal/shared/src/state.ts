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

/**
 * Get the effective app ID (env var takes precedence over selected)
 */
export function getEffectiveAppId(): string | undefined {
  return process.env.APPSIGNAL_APP_ID || selectedAppId;
}

/**
 * Check if the app ID is locked (configured via environment variable)
 */
export function isAppIdLocked(): boolean {
  return !!process.env.APPSIGNAL_APP_ID;
}
