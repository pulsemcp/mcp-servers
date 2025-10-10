import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIServerConfigGenerator } from '../../../shared/src/llm/openai-client.js';
import type { LLMConfig, ServerConfigInput } from '../../../shared/src/llm/types.js';

// Mock the OpenAI SDK
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  const MockOpenAI = vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  }));
  MockOpenAI.mockCreate = mockCreate;
  return {
    default: MockOpenAI,
  };
});

interface MockOpenAIConstructor {
  new (): {
    chat: {
      completions: {
        create: ReturnType<typeof vi.fn>;
      };
    };
  };
  mockCreate: ReturnType<typeof vi.fn>;
  mock: {
    instances: unknown[];
  };
}

describe('OpenAIServerConfigGenerator', () => {
  let generator: OpenAIServerConfigGenerator;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Get the mocked OpenAI class and its create method
    const OpenAIClass = vi.mocked(await import('openai'))
      .default as unknown as MockOpenAIConstructor;
    mockCreate = OpenAIClass.mockCreate;

    const config: LLMConfig = {
      provider: 'openai',
      apiKey: 'test-api-key',
    };

    generator = new OpenAIServerConfigGenerator(config);
  });

  describe('constructor', () => {
    it('should throw error when API key is missing', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: '',
      };

      expect(() => new OpenAIServerConfigGenerator(config)).toThrow('OpenAI API key is required');
    });

    it('should use default model when none specified', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      expect(() => new OpenAIServerConfigGenerator(config)).not.toThrow();
    });

    it('should use custom model when specified', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-5-2025-08-07',
      };

      expect(() => new OpenAIServerConfigGenerator(config)).not.toThrow();
    });
  });

  describe('generateServerConfig', () => {
    it('should successfully generate server configuration', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `<config>
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

    it('should handle empty response content', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from OpenAI response');
    });

    it('should handle response without config tags', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'Invalid response without config tags',
            },
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
        choices: [
          {
            message: {
              content: `<config>
{invalid json}
</config>`,
            },
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

    it('should handle OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI server config generation failed: Rate limit exceeded');
    });

    it('should send correct parameters to OpenAI API', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `<config>{"mcpServers": {}}</config>`,
            },
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
        model: 'gpt-5-2025-08-07',
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: expect.stringContaining(
              'You are an expert at converting MCP server configurations'
            ),
          },
          {
            role: 'user',
            content: expect.stringContaining('postgres-server'),
          },
        ],
      });
    });

    it('should handle explanation without explanation tags', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `<config>
{"mcpServers": {"test": {"command": "npx"}}}
</config>`,
            },
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

    it('should handle missing choices in response', async () => {
      const mockResponse = {
        choices: [],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from OpenAI response');
    });

    it('should handle missing message in choice', async () => {
      const mockResponse = {
        choices: [{}],
      };

      mockCreate.mockResolvedValue(mockResponse);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from OpenAI response');
    });
  });
});
