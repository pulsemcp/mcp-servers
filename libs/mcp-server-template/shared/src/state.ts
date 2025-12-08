// =============================================================================
// DYNAMIC TOOL STATE MANAGEMENT
// =============================================================================
// This module provides in-memory state management for dynamic tool behavior.
// Use this pattern when:
// - Tools need to be enabled/disabled based on user selections
// - You need to track session state across tool calls
// - Tools depend on previous operations (e.g., select before use)
//
// Example use case: User must select a workspace before using workspace-specific tools
// =============================================================================

/**
 * Server state interface - extend with your own state properties.
 */
interface ServerState {
  /** Currently selected resource ID (e.g., workspace, project, app) */
  selectedResourceId: string | null;

  /** Whether the resource ID is locked (e.g., from environment variable) */
  isResourceLocked: boolean;

  /** Additional state properties can be added here */
  // sessionStartTime: Date;
  // lastActivityTime: Date;
  // customSettings: Record<string, unknown>;
}

// In-memory state (reset on server restart)
let state: ServerState = {
  selectedResourceId: null,
  isResourceLocked: false,
};

// =============================================================================
// STATE GETTERS
// =============================================================================

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

// =============================================================================
// STATE SETTERS
// =============================================================================

/**
 * Set the selected resource ID.
 * @param resourceId - The resource ID to select
 * @param locked - Whether this selection is locked (default: false)
 * @throws Error if trying to change a locked resource
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
 * @throws Error if the resource selection is locked
 */
export function clearSelectedResource(): void {
  if (state.isResourceLocked) {
    throw new Error('Cannot clear resource: selection is locked');
  }

  state.selectedResourceId = null;
}

/**
 * Initialize state from environment variables.
 * Call this at server startup.
 */
export function initializeStateFromEnvironment(): void {
  // Example: Initialize from environment variable
  const envResourceId = process.env.YOUR_RESOURCE_ID;

  if (envResourceId) {
    state.selectedResourceId = envResourceId;
    state.isResourceLocked = true; // Lock when set from environment
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

// =============================================================================
// USAGE EXAMPLE IN TOOLS
// =============================================================================
// In your tools.ts, you can use state to conditionally enable/disable tools:
//
// import { hasSelectedResource, getSelectedResourceId } from './state.js';
//
// // Check if resource is selected before allowing tool use
// if (!hasSelectedResource()) {
//   return {
//     content: [{ type: 'text', text: 'Please select a resource first using select_resource tool' }],
//     isError: true,
//   };
// }
//
// // Use the selected resource
// const resourceId = getSelectedResourceId()!;
// const result = await client.doSomething(resourceId, ...);
// =============================================================================
