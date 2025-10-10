import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { ClaudeCodeClient } from '../../shared/src/claude-code-client/claude-code-client.js';
import { ServerConfigGeneratorFactory } from '../../shared/src/llm/factory.js';
import { MockServerConfigGenerator, createSuccessfulMockGenerator } from '../mocks/llm-mock.js';

// Mock the file system
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    access: vi.fn(),
    readdir: vi.fn(),
  },
}));

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

// Mock the LLM factory
vi.mock('../../shared/src/llm/factory.js', () => ({
  ServerConfigGeneratorFactory: {
    createFromEnv: vi.fn(),
    isAvailable: vi.fn(),
  },
}));

describe('ClaudeCodeClient - installServers with LLM', () => {
  let client: ClaudeCodeClient;
  let mockGenerator: MockServerConfigGenerator;
  const mockFs = vi.mocked(fs);
  const mockFactory = vi.mocked(ServerConfigGeneratorFactory);

  // Mock server configurations
  const mockServerConfigs = [
    {
      name: 'com.postgres/mcp',
      description: 'PostgreSQL database integration',
      version: '1.0.0',
      packages: [
        {
          type: 'npm',
          name: 'postgres-mcp',
          command: 'npx',
          args: ['postgres-mcp'],
        },
      ],
      environmentVariables: [
        {
          name: 'DATABASE_URL',
          description: 'PostgreSQL connection string',
          required: true,
        },
      ],
    },
    {
      name: 'com.pulsemcp/fetch',
      description: 'Web fetching capabilities',
      version: '1.0.0',
      packages: [
        {
          type: 'npm',
          name: '@pulsemcp/fetch',
          command: 'npx',
          args: ['@pulsemcp/fetch'],
        },
      ],
    },
  ];

  const mockSecrets = {
    'com.postgres/mcp': {
      DATABASE_URL: 'postgresql://localhost:5432/testdb',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock file system
    mockFs.readFile.mockImplementation((path: string) => {
      if (path.includes('servers.json')) {
        return Promise.resolve(JSON.stringify(mockServerConfigs));
      }
      if (path.includes('secrets.json')) {
        return Promise.resolve(JSON.stringify(mockSecrets));
      }
      return Promise.reject(new Error('File not found'));
    });

    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);

    // Setup mock LLM generator
    mockGenerator = createSuccessfulMockGenerator();
    mockFactory.createFromEnv.mockReturnValue(mockGenerator);
    mockFactory.isAvailable.mockReturnValue(true);

    // Create client
    client = new ClaudeCodeClient(
      '/mock/claude',
      '/mock/trusted-servers.json',
      '/mock/servers.json',
      '/tmp/test-agents',
      '/mock/secrets.json',
      true
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('installServers with LLM generation', () => {
    beforeEach(async () => {
      // Initialize agent first
      await client.initAgent('Test system prompt', '/tmp/test-working', 'test-agent');
    });

    it('should successfully install servers using LLM configuration generation', async () => {
      const serverNames = ['com.postgres/mcp', 'com.pulsemcp/fetch'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(2);
      expect(result.installations[0]).toMatchObject({
        serverName: 'com.postgres/mcp',
        status: 'success',
      });
      expect(result.installations[1]).toMatchObject({
        serverName: 'com.pulsemcp/fetch',
        status: 'success',
      });
      expect(result.mcpConfigPath).toBe('/tmp/test-working/.mcp.json');

      // Verify LLM was called for each server
      expect(mockGenerator.getCallLog()).toHaveLength(2);

      // Verify MCP config was written
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/tmp/test-working/.mcp.json',
        expect.stringContaining('"mcpServers"'),
        expect.anything()
      );
    });

    it('should inject secrets into generated configurations', async () => {
      const serverNames = ['com.postgres/mcp'];

      await client.installServers(serverNames);

      // Verify the configuration was generated and written
      const writeCall = mockFs.writeFile.mock.calls.find((call) =>
        call[0].toString().includes('.mcp.json')
      );
      expect(writeCall).toBeDefined();

      const writtenConfig = JSON.parse(writeCall![1] as string);
      expect(writtenConfig.mcpServers).toBeDefined();
    });

    it('should handle LLM generation failures gracefully', async () => {
      // Setup generator to fail
      mockGenerator.setSuccess(false);
      mockGenerator.setMockError('LLM API unavailable');

      const serverNames = ['com.postgres/mcp'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(1);
      expect(result.installations[0]).toMatchObject({
        serverName: 'com.postgres/mcp',
        status: 'failed',
        error: 'LLM API unavailable',
      });
    });

    it('should handle server not found in configurations', async () => {
      const serverNames = ['nonexistent-server'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(1);
      expect(result.installations[0]).toMatchObject({
        serverName: 'nonexistent-server',
        status: 'failed',
        error: 'Server configuration not found',
      });
    });

    it('should pass user preferences to LLM generator', async () => {
      const serverNames = ['com.postgres/mcp'];
      const serverConfigs = {
        'com.postgres/mcp': {
          env: {
            CUSTOM_VAR: 'custom_value',
          },
        },
      };

      await client.installServers(serverNames, serverConfigs);

      const lastCall = mockGenerator.getLastCall();
      expect(lastCall.input.userPreferences).toMatchObject({
        serverName: 'com.postgres/mcp',
        includeEnvironmentVariables: true,
        workingDirectory: '/tmp/test-working',
      });
    });

    it('should handle multiple servers with mixed success/failure', async () => {
      // Set up generator to succeed for first call, fail for second
      let callCount = 0;
      mockGenerator.generateServerConfig = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            success: true,
            mcpConfig: {
              mcpServers: {
                'com.postgres/mcp': {
                  command: 'npx',
                  args: ['postgres-mcp'],
                },
              },
            },
            explanation: 'Success',
          });
        } else {
          return Promise.resolve({
            success: false,
            error: 'Generation failed for second server',
          });
        }
      });

      const serverNames = ['com.postgres/mcp', 'com.pulsemcp/fetch'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(2);
      expect(result.installations[0].status).toBe('success');
      expect(result.installations[1].status).toBe('failed');
      expect(result.installations[1].error).toBe('Generation failed for second server');
    });

    it('should handle empty LLM response gracefully', async () => {
      mockGenerator.setMockConfig({
        mcpServers: {},
      });

      const serverNames = ['com.postgres/mcp'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(1);
      expect(result.installations[0]).toMatchObject({
        serverName: 'com.postgres/mcp',
        status: 'failed',
        error: 'Generated configuration is empty',
      });
    });

    it('should handle LLM configuration with unexpected structure', async () => {
      mockGenerator.setMockConfig({
        mcpServers: {
          'different-name': {
            command: 'npx',
            args: ['test'],
          },
        },
      });

      const serverNames = ['com.postgres/mcp'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(1);
      expect(result.installations[0].status).toBe('success');
    });

    it('should update agent state with installed servers', async () => {
      const serverNames = ['com.postgres/mcp'];

      await client.installServers(serverNames);

      const agentState = await client.getAgentState();
      expect(agentState?.installedServers).toContain('com.postgres/mcp');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await client.initAgent('Test system prompt', '/tmp/test-working', 'test-agent');
    });

    it('should handle file system errors when reading server configs', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const serverNames = ['com.postgres/mcp'];

      await expect(client.installServers(serverNames)).rejects.toThrow('Failed to install servers');
    });

    it('should handle file system errors when writing MCP config', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

      const serverNames = ['com.postgres/mcp'];

      await expect(client.installServers(serverNames)).rejects.toThrow('Disk full');
    });

    it('should handle malformed server configs JSON', async () => {
      mockFs.readFile.mockImplementation((path: string) => {
        if (path.includes('servers.json')) {
          return Promise.resolve('invalid json');
        }
        return Promise.reject(new Error('File not found'));
      });

      const serverNames = ['com.postgres/mcp'];

      await expect(client.installServers(serverNames)).rejects.toThrow();
    });

    it('should continue if secrets file is not readable', async () => {
      mockFs.readFile.mockImplementation((path: string) => {
        if (path.includes('servers.json')) {
          return Promise.resolve(JSON.stringify(mockServerConfigs));
        }
        if (path.includes('secrets.json')) {
          return Promise.reject(new Error('Secrets file not found'));
        }
        return Promise.reject(new Error('File not found'));
      });

      const serverNames = ['com.postgres/mcp'];

      const result = await client.installServers(serverNames);

      expect(result.installations).toHaveLength(1);
      expect(result.installations[0].status).toBe('success');
    });
  });
});
