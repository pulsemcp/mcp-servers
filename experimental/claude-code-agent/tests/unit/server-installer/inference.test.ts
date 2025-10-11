import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateInferencePrompt,
  runServerConfigInference,
  FileSecretsProvider,
} from '../../../shared/src/server-installer/inference.js';
import {
  InferenceRequest,
  IClaudeCodeInferenceClient,
} from '../../../shared/src/server-installer/types.js';

describe('generateInferencePrompt', () => {
  it('should generate a complete prompt with context and secrets', () => {
    const request: InferenceRequest = {
      servers: [
        {
          name: 'com.example/test',
          config: {
            name: 'com.example/test',
            description: 'Test server',
            packages: [
              {
                registryType: 'npm',
                identifier: '@example/test-server',
                runtimeHint: 'npx',
                environmentVariables: [
                  { name: 'API_KEY', required: true },
                  { name: 'TIMEOUT', value: '30000', required: false },
                ],
              },
            ],
          },
        },
      ],
      context: {
        purpose: 'Testing MCP servers',
        environment: 'development',
        preferRemote: false,
      },
      secretsAvailable: ['API_KEY', 'DATABASE_URL'],
    };

    const prompt = generateInferencePrompt(request);

    expect(prompt).toContain('Purpose: Testing MCP servers');
    expect(prompt).toContain('Environment: development');
    expect(prompt).toContain('Preference: Local packages when available');
    expect(prompt).toContain('- API_KEY');
    expect(prompt).toContain('- DATABASE_URL');
    expect(prompt).toContain('### com.example/test');
    expect(prompt).toContain('Description: Test server');
    expect(prompt).toContain('@example/test-server');
    expect(prompt).toContain('API_KEY (required)');
    expect(prompt).toContain('TIMEOUT (optional)');
  });

  it('should handle minimal request without context or secrets', () => {
    const request: InferenceRequest = {
      servers: [
        {
          name: 'com.example/simple',
          config: {
            name: 'com.example/simple',
            description: 'Simple server',
            packages: [
              {
                registryType: 'npm',
                identifier: '@example/simple-server',
              },
            ],
          },
        },
      ],
    };

    const prompt = generateInferencePrompt(request);

    expect(prompt).toContain('No secrets available');
    expect(prompt).toContain('### com.example/simple');
    expect(prompt).toContain('Description: Simple server');
    expect(prompt).toContain('@example/simple-server');
  });

  it('should format remote servers correctly', () => {
    const request: InferenceRequest = {
      servers: [
        {
          name: 'com.example/remote',
          config: {
            name: 'com.example/remote',
            description: 'Remote server',
            remotes: [
              {
                type: 'streamable-http',
                url: 'https://api.example.com/mcp',
              },
              {
                type: 'sse',
                url: 'https://sse.example.com/mcp',
              },
            ],
          },
        },
      ],
    };

    const prompt = generateInferencePrompt(request);

    expect(prompt).toContain('Remote Options:');
    expect(prompt).toContain('**streamable-http**: https://api.example.com/mcp');
    expect(prompt).toContain('**sse**: https://sse.example.com/mcp');
  });
});

describe('runServerConfigInference', () => {
  let mockClaudeClient: IClaudeCodeInferenceClient;

  beforeEach(() => {
    mockClaudeClient = {
      runInference: vi.fn(),
    };
  });

  it('should parse valid JSON response from Claude', async () => {
    const expectedResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/test',
          selectedPackage: {
            registryType: 'npm' as const,
            identifier: '@example/test-server',
            runtimeHint: 'npx' as const,
          },
          selectedTransport: {
            type: 'stdio' as const,
          },
          environmentVariables: {
            API_KEY: 'test-key',
            TIMEOUT: '30000',
          },
          rationale: 'Selected npm package for Node.js compatibility',
        },
      ],
    };

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(JSON.stringify(expectedResponse));

    const request: InferenceRequest = {
      servers: [
        {
          name: 'com.example/test',
          config: {
            name: 'com.example/test',
            description: 'Test server',
            packages: [{ registryType: 'npm', identifier: '@example/test-server' }],
          },
        },
      ],
    };

    const result = await runServerConfigInference(request, mockClaudeClient);

    expect(result).toEqual(expectedResponse);
  });

  it('should extract JSON from markdown code blocks', async () => {
    const jsonResponse = {
      serverConfigurations: [
        {
          serverName: 'com.example/test',
          selectedPackage: { registryType: 'npm', identifier: '@example/test' },
          selectedTransport: { type: 'stdio' },
          environmentVariables: {},
        },
      ],
    };

    const markdownResponse = `Here's the configuration:

\`\`\`json
${JSON.stringify(jsonResponse, null, 2)}
\`\`\`

This should work well for your setup.`;

    vi.mocked(mockClaudeClient.runInference).mockResolvedValue(markdownResponse);

    const request: InferenceRequest = {
      servers: [
        {
          name: 'com.example/test',
          config: {
            name: 'com.example/test',
            description: 'Test server',
            packages: [{ registryType: 'npm', identifier: '@example/test' }],
          },
        },
      ],
    };

    const result = await runServerConfigInference(request, mockClaudeClient);

    expect(result.serverConfigurations).toHaveLength(1);
    expect(result.serverConfigurations[0].serverName).toBe('com.example/test');
  });

  it('should throw error for invalid JSON response', async () => {
    vi.mocked(mockClaudeClient.runInference).mockResolvedValue('Invalid JSON response');

    const request: InferenceRequest = {
      servers: [
        {
          name: 'com.example/test',
          config: {
            name: 'com.example/test',
            description: 'Test server',
            packages: [{ registryType: 'npm', identifier: '@example/test' }],
          },
        },
      ],
    };

    await expect(runServerConfigInference(request, mockClaudeClient)).rejects.toThrow(
      'Failed to parse inference response'
    );
  });
});

describe('FileSecretsProvider', () => {
  let provider: FileSecretsProvider;

  beforeEach(() => {
    provider = new FileSecretsProvider('/mock/secrets.json');
  });

  it('should return undefined for missing secrets file', async () => {
    const providerWithoutFile = new FileSecretsProvider();
    expect(await providerWithoutFile.getSecret('API_KEY')).toBeUndefined();
    expect(await providerWithoutFile.listAvailableSecrets()).toEqual([]);
  });

  it('should handle file read errors gracefully', async () => {
    // FileSecretsProvider will try to read a non-existent file
    expect(await provider.getSecret('API_KEY')).toBeUndefined();
    expect(await provider.listAvailableSecrets()).toEqual([]);
  });
});
