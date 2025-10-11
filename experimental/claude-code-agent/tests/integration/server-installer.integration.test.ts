import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installServers, createInstaller } from '../../shared/src/server-installer/index.js';
import {
  IClaudeCodeInferenceClient,
  ISecretsProvider,
} from '../../shared/src/server-installer/types.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Server Installer Integration', () => {
  let testDir: string;
  let serversConfigPath: string;
  let secretsPath: string;
  let mockClaudeClient: IClaudeCodeInferenceClient;
  let mockSecretsProvider: ISecretsProvider;

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `mcp-installer-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    serversConfigPath = join(testDir, 'servers.json');
    secretsPath = join(testDir, 'secrets.json');

    // Mock Claude client with realistic responses
    mockClaudeClient = {
      runInference: vi.fn(),
    };

    // Mock secrets provider
    mockSecretsProvider = {
      getSecret: vi.fn(),
      listAvailableSecrets: vi.fn().mockResolvedValue(['API_KEY', 'DATABASE_URL']),
    };

    // Write test server configurations
    const serverConfigs = [
      {
        name: 'com.pulsemcp/fetch',
        description: 'Web fetching capabilities for HTTP requests',
        packages: [
          {
            registryType: 'npm',
            identifier: '@pulsemcp/fetch',
            version: '0.2.10',
            runtimeHint: 'npx',
            transport: { type: 'stdio' },
            environmentVariables: [
              { name: 'TIMEOUT', value: '30000', required: false },
              { name: 'USER_AGENT', value: 'MCP-Fetch/1.0', required: false },
            ],
          },
        ],
      },
      {
        name: 'com.postgres/mcp',
        description: 'PostgreSQL database integration',
        packages: [
          {
            registryType: 'npm',
            identifier: '@crystaldba/postgres-mcp-server',
            runtimeHint: 'npx',
            transport: { type: 'stdio' },
            environmentVariables: [
              { name: 'DATABASE_URL', required: true },
              { name: 'MAX_CONNECTIONS', value: '10', required: false },
            ],
          },
        ],
      },
      {
        name: 'com.example/remote',
        description: 'Remote HTTP MCP server',
        remotes: [
          {
            type: 'streamable-http',
            url: 'https://api.example.com/mcp',
          },
        ],
      },
    ];

    await writeFile(serversConfigPath, JSON.stringify(serverConfigs, null, 2));

    // Write test secrets
    const secrets = {
      API_KEY: 'test-api-key-12345',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
    };

    await writeFile(secretsPath, JSON.stringify(secrets, null, 2));
  });

  it('should install multiple servers with different configurations', async () => {
    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.pulsemcp/fetch',
          selectedPackage: {
            registryType: 'npm',
            identifier: '@pulsemcp/fetch',
            version: '0.2.10',
            runtimeHint: 'npx',
          },
          selectedTransport: {
            type: 'stdio',
          },
          environmentVariables: {
            TIMEOUT: '30000',
            USER_AGENT: 'MCP-Fetch/1.0',
          },
          rationale: 'Selected npm package for web fetching with default timeouts',
        },
        {
          serverName: 'com.postgres/mcp',
          selectedPackage: {
            registryType: 'npm',
            identifier: '@crystaldba/postgres-mcp-server',
            runtimeHint: 'npx',
          },
          selectedTransport: {
            type: 'stdio',
          },
          environmentVariables: {
            DATABASE_URL: '${DATABASE_URL}',
            MAX_CONNECTIONS: '10',
          },
          rationale: 'Selected PostgreSQL server with database connection from secrets',
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));
    vi.mocked(mockSecretsProvider.getSecret).mockImplementation(async (key) => {
      const secrets: Record<string, string> = {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
      };
      return secrets[key];
    });

    const result = await installServers(
      ['com.pulsemcp/fetch', 'com.postgres/mcp'],
      serversConfigPath,
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.installations).toHaveLength(2);
    expect(result.installations.every((i) => i.status === 'success')).toBe(true);

    // Verify fetch server configuration
    expect(result.mcpConfig.mcpServers['com.pulsemcp/fetch']).toEqual({
      command: 'npx',
      args: ['@pulsemcp/fetch@0.2.10'],
      env: {
        TIMEOUT: '30000',
        USER_AGENT: 'MCP-Fetch/1.0',
      },
    });

    // Verify PostgreSQL server configuration with secret resolution
    expect(result.mcpConfig.mcpServers['com.postgres/mcp']).toEqual({
      command: 'npx',
      args: ['@crystaldba/postgres-mcp-server'],
      env: {
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/testdb',
        MAX_CONNECTIONS: '10',
      },
    });
  });

  it('should handle remote servers with transport configuration', async () => {
    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/remote',
          selectedPackage: {
            registryType: 'npm',
            identifier: '@example/remote-client',
            runtimeHint: 'npx',
          },
          selectedTransport: {
            type: 'streamable-http',
            url: 'https://api.example.com/mcp',
          },
          environmentVariables: {},
          rationale: 'Selected remote HTTP transport for cloud-based processing',
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));

    const result = await installServers(
      ['com.example/remote'],
      serversConfigPath,
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.installations[0].status).toBe('success');
    expect(result.mcpConfig.mcpServers['com.example/remote']).toEqual({
      command: 'npx',
      args: ['@example/remote-client'],
      transport: {
        type: 'streamable-http',
        url: 'https://api.example.com/mcp',
      },
    });
  });

  it('should work with factory-created installer', async () => {
    const installer = createInstaller(mockClaudeClient, serversConfigPath, {
      secretsProvider: mockSecretsProvider,
    });

    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.pulsemcp/fetch',
          selectedPackage: {
            registryType: 'npm',
            identifier: '@pulsemcp/fetch',
            runtimeHint: 'npx',
          },
          selectedTransport: {
            type: 'stdio',
          },
          environmentVariables: {},
          rationale: 'Simple fetch server installation',
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));

    const result = await installer(['com.pulsemcp/fetch']);

    expect(result.installations).toHaveLength(1);
    expect(result.installations[0].status).toBe('success');
    expect(result.mcpConfig.mcpServers['com.pulsemcp/fetch']).toBeDefined();
  });

  it('should include installation context in inference', async () => {
    const context = {
      purpose: 'Setting up development environment for web scraping',
      environment: 'development' as const,
      preferRemote: false,
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(
      JSON.stringify({
        serverConfigurations: [],
      })
    );

    await installServers(['com.pulsemcp/fetch'], serversConfigPath, mockClaudeClient, {
      secretsProvider: mockSecretsProvider,
      context,
    });

    const inferenceCall = vi.mocked(mockClaudeClient.runInference).mock.calls[0][0];

    expect(inferenceCall).toContain('Purpose: Setting up development environment for web scraping');
    expect(inferenceCall).toContain('Environment: development');
    expect(inferenceCall).toContain('Preference: Local packages when available');
    expect(inferenceCall).toContain('### com.pulsemcp/fetch');
    expect(inferenceCall).toContain('Web fetching capabilities for HTTP requests');
  });

  it('should handle warnings from inference', async () => {
    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.postgres/mcp',
          selectedPackage: {
            registryType: 'npm',
            identifier: '@crystaldba/postgres-mcp-server',
            runtimeHint: 'npx',
          },
          selectedTransport: {
            type: 'stdio',
          },
          environmentVariables: {
            DATABASE_URL: '${DATABASE_URL}',
            MAX_CONNECTIONS: '10',
          },
          rationale: 'PostgreSQL server with missing DATABASE_URL secret',
        },
      ],
      warnings: [
        'DATABASE_URL secret is required but not available',
        'Consider setting up PostgreSQL connection before using this server',
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));
    vi.mocked(mockSecretsProvider.getSecret).mockResolvedValue(undefined); // No secrets available

    const result = await installServers(['com.postgres/mcp'], serversConfigPath, mockClaudeClient, {
      secretsProvider: mockSecretsProvider,
    });

    expect(result.warnings).toEqual([
      'DATABASE_URL secret is required but not available',
      'Consider setting up PostgreSQL connection before using this server',
    ]);
  });
});
