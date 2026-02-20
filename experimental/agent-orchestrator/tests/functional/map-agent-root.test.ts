import { describe, it, expect } from 'vitest';
import {
  mapAgentRoot,
  type RawAgentRoot,
} from '../../shared/src/orchestrator-client/orchestrator-client.js';

describe('mapAgentRoot', () => {
  it('should map all renamed fields from the raw API response', () => {
    const raw: RawAgentRoot = {
      name: 'mcp-servers',
      display_name: 'MCP Servers',
      description: 'PulseMCP MCP servers monorepo',
      url: 'https://github.com/pulsemcp/mcp-servers.git',
      default_branch: 'main',
      subdirectory: 'experimental/twist',
      default_stop_condition: 'open-reviewed-green-pr',
      default_mcp_servers: ['github-development'],
      custom: false,
      default: true,
    };

    const result = mapAgentRoot(raw);

    expect(result).toEqual({
      name: 'mcp-servers',
      title: 'MCP Servers',
      description: 'PulseMCP MCP servers monorepo',
      git_root: 'https://github.com/pulsemcp/mcp-servers.git',
      default_branch: 'main',
      default_subdirectory: 'experimental/twist',
      default_stop_condition: 'open-reviewed-green-pr',
      default_mcp_servers: ['github-development'],
    });

    // Verify renamed fields specifically
    expect(result.title).toBe(raw.display_name);
    expect(result.git_root).toBe(raw.url);
    expect(result.default_subdirectory).toBe(raw.subdirectory);

    // Verify API-only fields are not present
    expect(result).not.toHaveProperty('custom');
    expect(result).not.toHaveProperty('default');
    expect(result).not.toHaveProperty('display_name');
    expect(result).not.toHaveProperty('url');
    expect(result).not.toHaveProperty('subdirectory');
  });

  it('should handle minimal agent root with only required fields', () => {
    const raw: RawAgentRoot = {
      name: 'simple-root',
      display_name: 'Simple Root',
      description: 'A minimal agent root',
      url: 'https://github.com/example/repo.git',
    };

    const result = mapAgentRoot(raw);

    expect(result).toEqual({
      name: 'simple-root',
      title: 'Simple Root',
      description: 'A minimal agent root',
      git_root: 'https://github.com/example/repo.git',
      default_branch: undefined,
      default_subdirectory: undefined,
      default_stop_condition: undefined,
      default_mcp_servers: undefined,
    });
  });
});
