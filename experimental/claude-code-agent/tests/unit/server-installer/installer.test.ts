import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installServers } from '../../../shared/src/server-installer/installer.js';
import {
  IClaudeCodeInferenceClient,
  ISecretsProvider,
  ServerConfig,
} from '../../../shared/src/server-installer/types.js';
import { readFile } from 'fs/promises';

// Mock fs.promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

describe('installServers', () => {
  let mockClaudeClient: IClaudeCodeInferenceClient;
  let mockSecretsProvider: ISecretsProvider;
  let mockServerConfigs: ServerConfig[];

  beforeEach(() => {
    mockClaudeClient = {
      runInference: vi.fn(),
    };

    mockSecretsProvider = {
      getSecret: vi.fn(),
      listAvailableSecrets: vi.fn().mockResolvedValue(['API_KEY', 'DATABASE_URL']),
    };

    mockServerConfigs = [
      {
        name: 'com.example/npm-server',
        description: 'NPM-based MCP server',
        packages: [
          {
            registryType: 'npm',
            identifier: '@example/npm-server',
            version: '1.0.0',
            runtimeHint: 'npx',
            transport: { type: 'stdio' },
            environmentVariables: [
              { name: 'API_KEY', required: true },
              { name: 'TIMEOUT', value: '30000', required: false },
            ],
          },
        ],
      },
      {
        name: 'com.example/python-server',
        description: 'Python-based MCP server',
        packages: [
          {
            registryType: 'pypi',
            identifier: 'example-python-server',
            runtimeHint: 'uvx',
            transport: { type: 'stdio' },
          },
        ],
      },
      {
        name: 'com.example/remote-server',
        description: 'Remote HTTP server',
        remotes: [
          {
            type: 'streamable-http',
            url: 'https://api.example.com/mcp',
          },
        ],
      },
    ];

    // Mock fs.readFile to return server configs
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockServerConfigs));
  });

  it('should successfully install NPM servers', async () => {
    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/npm-server',
          selectedPackage: {
            registryType: 'npm' as const,
            identifier: '@example/npm-server',
            version: '1.0.0',
            runtimeHint: 'npx' as const,
          },
          selectedTransport: {
            type: 'stdio' as const,
          },
          environmentVariables: {
            API_KEY: '${API_KEY}',
            TIMEOUT: '30000',
          },
          rationale: 'Selected npm package for Node.js compatibility',
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));
    vi.mocked(mockSecretsProvider.getSecret).mockImplementation(async (key) => {
      if (key === 'API_KEY') return 'secret-api-key';
      return undefined;
    });

    const result = await installServers(
      ['com.example/npm-server'],
      '/mock/servers.json',
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.installations).toHaveLength(1);
    expect(result.installations[0].status).toBe('success');
    expect(result.installations[0].serverName).toBe('com.example/npm-server');

    expect(result.mcpConfig.mcpServers['com.example/npm-server']).toEqual({
      command: 'npx',
      args: ['@example/npm-server@1.0.0'],
      env: {
        API_KEY: 'secret-api-key',
        TIMEOUT: '30000',
      },
    });
  });

  it('should handle Python/uvx servers', async () => {
    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/python-server',
          selectedPackage: {
            registryType: 'pypi' as const,
            identifier: 'example-python-server',
            runtimeHint: 'uvx' as const,
          },
          selectedTransport: {
            type: 'stdio' as const,
          },
          environmentVariables: {},
          runtimeArguments: ['--timeout', '60'],
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));

    const result = await installServers(
      ['com.example/python-server'],
      '/mock/servers.json',
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.installations[0].status).toBe('success');
    expect(result.mcpConfig.mcpServers['com.example/python-server']).toEqual({
      command: 'uvx',
      args: ['example-python-server', '--timeout', '60'],
    });
  });

  it('should handle Docker containers', async () => {
    const dockerConfig: ServerConfig = {
      name: 'com.example/docker-server',
      description: 'Docker-based server',
      packages: [
        {
          registryType: 'oci',
          identifier: 'example/docker-server',
          version: 'latest',
          runtimeHint: 'docker',
        },
      ],
    };

    vi.mocked(readFile).mockResolvedValue(JSON.stringify([dockerConfig]));

    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/docker-server',
          selectedPackage: {
            registryType: 'oci' as const,
            identifier: 'example/docker-server',
            version: 'latest',
            runtimeHint: 'docker' as const,
          },
          selectedTransport: {
            type: 'stdio' as const,
          },
          environmentVariables: {},
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));

    const result = await installServers(
      ['com.example/docker-server'],
      '/mock/servers.json',
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.mcpConfig.mcpServers['com.example/docker-server']).toEqual({
      command: 'docker',
      args: ['run', '--rm', '-i', 'example/docker-server:latest'],
    });
  });

  it('should handle remote servers with transport configuration', async () => {
    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/remote-server',
          selectedPackage: {
            registryType: 'npm' as const,
            identifier: '@example/remote-client',
            runtimeHint: 'npx' as const,
          },
          selectedTransport: {
            type: 'streamable-http' as const,
            url: 'https://api.example.com/mcp',
          },
          environmentVariables: {},
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));

    const result = await installServers(
      ['com.example/remote-server'],
      '/mock/servers.json',
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.mcpConfig.mcpServers['com.example/remote-server']).toEqual({
      command: 'npx',
      args: ['@example/remote-client'],
      transport: {
        type: 'streamable-http',
        url: 'https://api.example.com/mcp',
      },
    });
  });

  it('should handle installation failures gracefully', async () => {
    vi.mocked(mockClaudeClient.runInference).mockRejectedValue(
      new Error('Claude inference failed')
    );

    await expect(
      installServers(['com.example/npm-server'], '/mock/servers.json', mockClaudeClient, {
        secretsProvider: mockSecretsProvider,
      })
    ).rejects.toThrow('Claude inference failed');
  });

  it('should throw error for unknown servers', async () => {
    await expect(
      installServers(['com.unknown/server'], '/mock/servers.json', mockClaudeClient, {
        secretsProvider: mockSecretsProvider,
      })
    ).rejects.toThrow('Server not found in configuration: com.unknown/server');
  });

  it('should load server configs from file', async () => {
    const mockConfigs = [{ name: 'test-server', description: 'Test', packages: [] }];
    vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockConfigs));

    // This will attempt to load configs and fail on unknown server, which proves loading worked
    await expect(
      installServers(['unknown-server'], '/mock/servers.json', mockClaudeClient)
    ).rejects.toThrow('Server not found in configuration');

    expect(readFile).toHaveBeenCalledWith('/mock/servers.json', 'utf-8');
  });

  it('should handle file loading errors', async () => {
    vi.mocked(readFile).mockRejectedValue(new Error('File not found'));

    await expect(
      installServers(['any-server'], '/nonexistent/servers.json', mockClaudeClient)
    ).rejects.toThrow('Failed to load server configurations from /nonexistent/servers.json');
  });

  it('should include installation context in inference request', async () => {
    const context = {
      purpose: 'Development testing',
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(
      JSON.stringify({
        serverConfigurations: [],
      })
    );

    await installServers(['com.example/npm-server'], '/mock/servers.json', mockClaudeClient, {
      secretsProvider: mockSecretsProvider,
      context,
    });

    // Verify that context was included in the inference prompt
    expect(mockClaudeClient.runInference).toHaveBeenCalledWith(
      expect.stringContaining('Purpose: Development testing')
    );
  });

  it('should handle complex local server with runtime and package arguments', async () => {
    const localServerConfig = {
      name: 'io.github.lucashild/bigquery',
      description: 'Google BigQuery MCP server for data warehouse operations',
      version: 'dev',
      repository: {
        url: 'https://github.com/mcp-bigquery/mcp-server-bigquery',
        source: 'github',
      },
      packages: [
        {
          registryType: 'local',
          identifier: 'mcp-server-bigquery',
          version: 'dev',
          runtimeHint: '/Users/admin/.local/bin/uv',
          transport: {
            type: 'stdio',
          },
          runtimeArguments: [
            {
              type: 'named',
              name: '--directory',
              value: '/Users/admin/github-projects/mcp-server-bigquery',
              description: 'Local project directory',
            },
            {
              type: 'positional',
              value: 'run',
              description: 'Run command in uv project',
            },
            {
              type: 'positional',
              value: 'mcp-server-bigquery',
              description: 'Package entry point',
            },
          ],
          packageArguments: [
            {
              type: 'named',
              name: '--project',
              value: 'pulse-443819',
              description: 'Google Cloud project ID',
            },
            {
              type: 'named',
              name: '--location',
              value: 'us-west1',
              description: 'BigQuery dataset location',
            },
            {
              type: 'named',
              name: '--dataset',
              value: 'pulse_warehouse',
              description: 'BigQuery dataset name',
            },
            {
              type: 'named',
              name: '--key-file',
              value: '/Users/admin/.secrets/bq-service-account.json',
              description: 'Path to service account JSON key file',
            },
          ],
        },
      ],
    };

    vi.mocked(readFile).mockResolvedValue(JSON.stringify([localServerConfig]));

    const inferenceResponse = {
      serverConfigurations: [
        {
          serverName: 'io.github.lucashild/bigquery',
          selectedPackage: {
            registryType: 'local',
            identifier: 'mcp-server-bigquery',
            version: 'dev',
            runtimeHint: '/Users/admin/.local/bin/uv',
          },
          selectedTransport: {
            type: 'stdio',
          },
          environmentVariables: {
            GOOGLE_APPLICATION_CREDENTIALS: '${GOOGLE_APPLICATION_CREDENTIALS}',
            GOOGLE_CLOUD_PROJECT: '${GOOGLE_CLOUD_PROJECT}',
          },
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(inferenceResponse));

    const result = await installServers(
      ['io.github.lucashild/bigquery'],
      '/mock/servers.json',
      mockClaudeClient,
      { secretsProvider: mockSecretsProvider }
    );

    expect(result.installations[0].status).toBe('success');

    // Verify the final configuration uses simplified name and combines all arguments
    expect(result.mcpConfig.mcpServers['bigquery']).toEqual({
      command: '/Users/admin/.local/bin/uv',
      args: [
        '--directory',
        '/Users/admin/github-projects/mcp-server-bigquery',
        'run',
        'mcp-server-bigquery',
        '--project',
        'pulse-443819',
        '--location',
        'us-west1',
        '--dataset',
        'pulse_warehouse',
        '--key-file',
        '/Users/admin/.secrets/bq-service-account.json',
      ],
      env: {
        GOOGLE_APPLICATION_CREDENTIALS: '${GOOGLE_APPLICATION_CREDENTIALS}',
        GOOGLE_CLOUD_PROJECT: '${GOOGLE_CLOUD_PROJECT}',
      },
    });
  });
});
