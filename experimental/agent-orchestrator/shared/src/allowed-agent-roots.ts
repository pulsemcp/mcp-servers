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
 * - git_root (and optionally branch/subdirectory) must match one of the allowed agent roots
 * - mcp_servers must exactly match the default_mcp_servers of that agent root
 *   (no more, no less — any deviation is rejected)
 *
 * When multiple allowed agent roots share the same git_root, branch and subdirectory
 * are used to disambiguate. This is critical for monorepo setups where multiple agent
 * roots point to the same repository but different subdirectories.
 *
 * Returns { valid: true } if the request is allowed, or { valid: false, error: string } if not.
 */
export function validateAgentRootConstraints(
  allowedRoots: string[] | null,
  agentRoots: AgentRootInfo[],
  gitRoot?: string,
  mcpServers?: string[],
  branch?: string,
  subdirectory?: string
): AgentRootValidationResult {
  if (allowedRoots === null) {
    return { valid: true };
  }

  // Find all allowed agent roots that match by git_root
  const candidates = agentRoots.filter(
    (root) => allowedRoots.includes(root.name) && root.git_root === gitRoot
  );

  // When multiple candidates share the same git_root, disambiguate using branch and subdirectory
  let matchingRoot: AgentRootInfo | undefined;
  if (candidates.length > 1) {
    matchingRoot = candidates.find((root) => {
      const branchMatch = !branch || (root.default_branch ?? 'main') === branch;
      const subdirMatch = !subdirectory || root.default_subdirectory === subdirectory;
      return branchMatch && subdirMatch;
    });
  } else {
    matchingRoot = candidates[0];
  }

  if (!matchingRoot) {
    const allowedNames = allowedRoots.join(', ');
    const allowedGitRoots = agentRoots
      .filter((root) => allowedRoots.includes(root.name))
      .map((root) => root.git_root);

    return {
      valid: false,
      error:
        `ALLOWED_AGENT_ROOTS is set — only the following agent roots are permitted: ${allowedNames}. ` +
        `The provided git_root "${gitRoot || '(not provided)'}" does not match any allowed agent root. ` +
        (allowedGitRoots.length > 0
          ? `Allowed git_root values: ${allowedGitRoots.join(', ')}`
          : 'No matching agent roots found in configuration.'),
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
