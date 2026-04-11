/**
 * ALLOWED_AGENT_ROOTS constraint system.
 *
 * When the ALLOWED_AGENT_ROOTS environment variable is set (comma-separated list of agent root names),
 * the server is constrained to only allow sessions using those specific agent roots
 * with their exact default MCP server configurations.
 *
 * This provides a way to lock down the server to only permit preconfigured invocations.
 */

import type { AgentRootInfo } from './types.js';

/**
 * Parse the ALLOWED_AGENT_ROOTS environment variable into a list of allowed agent root names.
 * Returns null if the env var is not set (meaning no restrictions).
 */
export function parseAllowedAgentRoots(envValue?: string): string[] | null {
  const value = envValue ?? process.env.ALLOWED_AGENT_ROOTS ?? '';

  if (!value.trim()) {
    return null; // No restrictions
  }

  const roots = value
    .split(',')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  if (roots.length === 0) {
    return null;
  }

  return roots;
}

/**
 * Filter agent roots to only include those in the allowed list.
 * If allowedRoots is null, returns all agent roots (no filtering).
 */
export function filterAgentRoots(
  agentRoots: AgentRootInfo[],
  allowedRoots: string[] | null
): AgentRootInfo[] {
  if (allowedRoots === null) {
    return agentRoots;
  }

  return agentRoots.filter((root) => allowedRoots.includes(root.name));
}

export interface AgentRootValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a start_session request against the allowed agent roots constraints.
 *
 * When ALLOWED_AGENT_ROOTS is set:
 * - agent_root must be provided and must be one of the allowed agent root names
 * - mcp_servers must exactly match the default_mcp_servers of that agent root
 *   (no more, no less — any deviation is rejected)
 *
 * Returns { valid: true } if the request is allowed, or { valid: false, error: string } if not.
 */
export function validateAgentRootConstraints(
  allowedRoots: string[] | null,
  agentRoots: AgentRootInfo[],
  agentRootName?: string,
  mcpServers?: string[]
): AgentRootValidationResult {
  if (allowedRoots === null) {
    return { valid: true };
  }

  if (!agentRootName) {
    return {
      valid: false,
      error:
        `ALLOWED_AGENT_ROOTS is set — agent_root is required. ` +
        `Allowed agent roots: ${allowedRoots.join(', ')}`,
    };
  }

  if (!allowedRoots.includes(agentRootName)) {
    return {
      valid: false,
      error:
        `ALLOWED_AGENT_ROOTS is set — agent_root "${agentRootName}" is not permitted. ` +
        `Allowed agent roots: ${allowedRoots.join(', ')}`,
    };
  }

  // Find the matching agent root config to validate mcp_servers
  const matchingRoot = agentRoots.find((root) => root.name === agentRootName);

  if (!matchingRoot) {
    return {
      valid: false,
      error:
        `Agent root "${agentRootName}" is in the allowed list but was not found in the configuration. ` +
        `Available agent roots: ${agentRoots.map((r) => r.name).join(', ')}`,
    };
  }

  // Validate mcp_servers matches the default_mcp_servers exactly
  const defaultServers = matchingRoot.default_mcp_servers ?? [];
  const requestedServers = mcpServers ?? [];

  const sortedDefault = [...defaultServers].sort();
  const sortedRequested = [...requestedServers].sort();

  const serversMatch =
    sortedDefault.length === sortedRequested.length &&
    sortedDefault.every((s, i) => s === sortedRequested[i]);

  if (!serversMatch) {
    const defaultStr = defaultServers.length > 0 ? defaultServers.join(', ') : '(none)';
    const requestedStr = requestedServers.length > 0 ? requestedServers.join(', ') : '(none)';

    return {
      valid: false,
      error:
        `ALLOWED_AGENT_ROOTS is set — agent root "${matchingRoot.name}" must use its exact default MCP servers. ` +
        `Expected: [${defaultStr}], but got: [${requestedStr}]. ` +
        `You cannot add or remove MCP servers when ALLOWED_AGENT_ROOTS restrictions are active.`,
    };
  }

  return { valid: true };
}
