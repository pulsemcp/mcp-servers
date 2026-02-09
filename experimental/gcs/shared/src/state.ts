/**
 * Server state interface.
 */
interface ServerState {
  /** Currently selected resource ID (e.g., workspace, project, app) */
  selectedResourceId: string | null;

  /** Whether the resource ID is locked (e.g., from environment variable) */
  isResourceLocked: boolean;
}

// In-memory state (reset on server restart)
let state: ServerState = {
  selectedResourceId: null,
  isResourceLocked: false,
};

/**
 * Get the currently selected resource ID.
 */
export function getSelectedResourceId(): string | null {
  return state.selectedResourceId;
}

/**
 * Check if a resource is currently selected.
 */
export function hasSelectedResource(): boolean {
  return state.selectedResourceId !== null;
}

/**
 * Check if the resource selection is locked (e.g., from environment variable).
 */
export function isResourceLocked(): boolean {
  return state.isResourceLocked;
}

/**
 * Get the full server state (useful for debugging/config resource).
 */
export function getServerState(): Readonly<ServerState> {
  return { ...state };
}

/**
 * Set the selected resource ID.
 */
export function setSelectedResourceId(resourceId: string, locked: boolean = false): void {
  if (state.isResourceLocked && state.selectedResourceId !== resourceId) {
    throw new Error(
      `Cannot change resource: current selection is locked to "${state.selectedResourceId}"`
    );
  }

  state.selectedResourceId = resourceId;
  state.isResourceLocked = locked;
}

/**
 * Clear the selected resource (only if not locked).
 */
export function clearSelectedResource(): void {
  if (state.isResourceLocked) {
    throw new Error('Cannot clear resource: selection is locked');
  }

  state.selectedResourceId = null;
}

/**
 * Initialize state from environment variables.
 */
export function initializeStateFromEnvironment(): void {
  const envResourceId = process.env.GCS_PROJECT_ID;

  if (envResourceId) {
    state.selectedResourceId = envResourceId;
    state.isResourceLocked = true;
  }
}

/**
 * Reset all state (useful for testing).
 */
export function resetState(): void {
  state = {
    selectedResourceId: null,
    isResourceLocked: false,
  };
}
