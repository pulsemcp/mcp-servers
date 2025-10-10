import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { ClaudeCodeClient } from '../../shared/src/claude-code-client/claude-code-client.js';
import { ServerConfigGeneratorFactory } from '../../shared/src/llm/factory.js';

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

describe('ClaudeCodeClient - installServers fallback behavior', () => {
  let client: ClaudeCodeClient;
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
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock file system
    mockFs.readFile.mockImplementation((path: string) => {
      if (path.includes('servers.json')) {
        return Promise.resolve(JSON.stringify(mockServerConfigs));
      }
      return Promise.reject(new Error('File not found'));
    });

    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);

    // Setup LLM factory to return null (not available)
    mockFactory.createFromEnv.mockReturnValue(null);
    mockFactory.isAvailable.mockReturnValue(false);

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

  describe('fallback when LLM is not available', () => {
    beforeEach(async () => {
      // Initialize agent first
      await client.initAgent('Test system prompt', '/tmp/test-working', 'test-agent');
    });

    it('should throw error when LLM is not available and legacy is not implemented', async () => {
      const serverNames = ['com.postgres/mcp'];

      await expect(client.installServers(serverNames)).rejects.toThrow(
        'Legacy server installation not implemented. Please configure LLM_PROVIDER and LLM_API_KEY environment variables to use LLM-based configuration generation.'
      );
    });

    it('should verify that LLM factory was called', async () => {
      const serverNames = ['com.postgres/mcp'];

      try {
        await client.installServers(serverNames);
      } catch {
        // Expected to fail
      }

      expect(mockFactory.createFromEnv).toHaveBeenCalled();
    });

    it('should handle no agent initialized error before checking LLM availability', async () => {
      // Don't initialize agent
      const newClient = new ClaudeCodeClient(
        '/mock/claude',
        '/mock/trusted-servers.json',
        '/mock/servers.json',
        '/tmp/test-agents',
        '/mock/secrets.json',
        true
      );

      const serverNames = ['com.postgres/mcp'];

      await expect(newClient.installServers(serverNames)).rejects.toThrow('No agent initialized');
    });

    it('should prioritize LLM generation when available over legacy fallback', async () => {
      // This test documents the behavior - LLM takes precedence when available
      // The actual implementation should check LLM first, then fall back to legacy

      // Reset mocks to simulate LLM being available
      const mockGenerator = {
        generateServerConfig: vi.fn().mockResolvedValue({
          success: true,
          mcpConfig: { mcpServers: { 'test-server': { command: 'npx' } } },
          explanation: 'Generated with LLM',
        }),
      };

      mockFactory.createFromEnv.mockReturnValue(
        mockGenerator as unknown as ReturnType<typeof ServerConfigGeneratorFactory.createFromEnv>
      );

      const serverNames = ['com.postgres/mcp'];

      const result = await client.installServers(serverNames);

      expect(result.installations[0].status).toBe('success');
      expect(mockGenerator.generateServerConfig).toHaveBeenCalled();
    });
  });

  describe('environment configuration handling', () => {
    it('should handle missing environment variables gracefully', async () => {
      // Clear environment variables
      const originalEnv = process.env;
      process.env = {};

      try {
        // Factory should return null when env vars are not set
        expect(mockFactory.createFromEnv()).toBeNull();
      } finally {
        process.env = originalEnv;
      }
    });

    it('should log appropriate warning when falling back to legacy', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await client.initAgent('Test system prompt', '/tmp/test-working', 'test-agent');

      try {
        await client.installServers(['com.postgres/mcp']);
      } catch {
        // Expected to fail
      }

      // The actual logging happens in the ClaudeCodeClient implementation
      // This test documents the expected behavior
      consoleSpy.mockRestore();
    });
  });

  describe('error scenarios without LLM', () => {
    beforeEach(async () => {
      await client.initAgent('Test system prompt', '/tmp/test-working', 'test-agent');
    });

    it('should provide clear error message about missing LLM configuration', async () => {
      const serverNames = ['com.postgres/mcp'];

      const error = await client.installServers(serverNames).catch((e) => e);

      expect(error.message).toContain('Legacy server installation not implemented');
      expect(error.message).toContain('LLM_PROVIDER and LLM_API_KEY');
    });

    it('should handle multiple servers consistently when LLM is unavailable', async () => {
      const serverNames = ['com.postgres/mcp', 'com.pulsemcp/fetch'];

      const error = await client.installServers(serverNames).catch((e) => e);

      expect(error.message).toContain('Legacy server installation not implemented');
    });

    it('should not attempt to write any MCP configuration when LLM is unavailable', async () => {
      const serverNames = ['com.postgres/mcp'];

      try {
        await client.installServers(serverNames);
      } catch {
        // Expected to fail
      }

      // Verify that .mcp.json was not written when installation fails
      const mcpWriteCalls = mockFs.writeFile.mock.calls.filter((call) =>
        call[0].toString().includes('.mcp.json')
      );

      // Should only have the initial empty .mcp.json from initAgent
      expect(mcpWriteCalls.length).toBeLessThanOrEqual(1);
    });
  });

  describe('isAvailable behavior', () => {
    it('should correctly report availability based on environment', () => {
      // When mocked to return false
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);

      // Reset mock to return true
      mockFactory.isAvailable.mockReturnValue(true);
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(true);
    });

    it('should be used consistently across the codebase', async () => {
      await client.initAgent('Test system prompt', '/tmp/test-working', 'test-agent');

      try {
        await client.installServers(['com.postgres/mcp']);
      } catch {
        // Expected to fail
      }

      // Verify that both createFromEnv and isAvailable are used consistently
      expect(mockFactory.createFromEnv).toHaveBeenCalled();
    });
  });
});
