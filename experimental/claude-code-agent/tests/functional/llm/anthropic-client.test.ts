import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicServerConfigGenerator } from '../../../shared/src/llm/anthropic-client.js';
import type { LLMConfig, ServerConfigInput } from '../../../shared/src/llm/types.js';

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  }));
  MockAnthropic.mockCreate = mockCreate;
  return {
    default: MockAnthropic,
  };
});

interface MockAnthropicConstructor {
  new (): {
    messages: {
      create: ReturnType<typeof vi.fn>;
    };
  };
  mockCreate: ReturnType<typeof vi.fn>;
  mock: {
    instances: unknown[];
  };
}

describe('AnthropicServerConfigGenerator', () => {
  let generator: AnthropicServerConfigGenerator;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked Anthropic class and its create method
    const AnthropicClass = vi.mocked(await import('@anthropic-ai/sdk'))
      .default as unknown as MockAnthropicConstructor;
    mockCreate = AnthropicClass.mockCreate;

    const config: LLMConfig = {
      provider: 'anthropic',
      apiKey: 'test-api-key',
    };

    generator = new AnthropicServerConfigGenerator(config);
  });

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: '',
      };

      expect(() => new AnthropicServerConfigGenerator(config)).toThrow(
        'Anthropic API key is required'
      );
    });

    it('should use default model when none specified', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };

      expect(() => new AnthropicServerConfigGenerator(config)).not.toThrow();
    });

    it('should use custom model when specified', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-sonnet-3-5-20241022',
      };

      expect(() => new AnthropicServerConfigGenerator(config)).not.toThrow();
    });
  });

  describe('generateServerConfig', () => {
    it('should successfully generate server configuration', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `<config>
{
  "mcpServers": {
    "test-server": {
      "command": "npx",
      "args": ["test-package"],
      "env": {
        "API_KEY": "test-key"
      }
    }
  }
}
</config>

<explanation>
Generated configuration for npm package test-package
</explanation>`,
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: {
          name: 'test-server',
          packages: [
            {
              type: 'npm',
              name: 'test-package',
              command: 'npx',
              args: ['test-package'],
            },
          ],
        },
        userPreferences: {
          serverName: 'test-server',
        },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(true);
      expect(result.mcpConfig).toEqual({
        mcpServers: {
          'test-server': {
            command: 'npx',
            args: ['test-package'],
            env: {
              API_KEY: 'test-key',
            },
          },
        },
      });
      expect(result.explanation).toBe('Generated configuration for npm package test-package');
    });

    it('should handle response without config tags', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Invalid response without config tags',
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Could not extract configuration from response');
    });

    it('should handle invalid JSON in config', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `<config>
{invalid json}
</config>`,
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse generated configuration');
    });

    it('should handle Anthropic API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Anthropic server config generation failed: API rate limit exceeded'
      );
    });

    it('should send correct parameters to Anthropic API', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `<config>{"mcpServers": {}}</config>`,
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: {
          name: 'postgres-server',
          description: 'PostgreSQL database integration',
          packages: [
            {
              type: 'npm',
              name: 'postgres-mcp',
            },
          ],
        },
        userPreferences: {
          serverName: 'postgres-server',
          includeEnvironmentVariables: true,
          workingDirectory: '/tmp/test',
        },
      };

      await generator.generateServerConfig(input);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0,
        system: expect.stringContaining(
          'You are an expert at converting MCP server configurations'
        ),
        messages: [
          {
            role: 'user',
            content: expect.stringContaining('postgres-server'),
          },
        ],
      });
    });

    it('should handle explanation without explanation tags', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: `<config>
{"mcpServers": {"test": {"command": "npx"}}}
</config>`,
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(true);
      expect(result.explanation).toBe('Configuration generated successfully');
    });

    it('should handle multiple content blocks', async () => {
      const mockResponse = {
        content: [
          {
            type: 'text',
            text: 'Some preamble text',
          },
          {
            type: 'text',
            text: `<config>
{"mcpServers": {"test": {"command": "npx"}}}
</config>`,
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(true);
      expect(result.mcpConfig).toEqual({
        mcpServers: {
          test: {
            command: 'npx',
          },
        },
      });
    });
  });
});
