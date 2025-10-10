import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AnthropicServerConfigGenerator } from '../../../shared/src/llm/anthropic-client.js';
import { OpenAIServerConfigGenerator } from '../../../shared/src/llm/openai-client.js';
import { ServerConfigGeneratorFactory } from '../../../shared/src/llm/factory.js';
import type { LLMConfig, ServerConfigInput } from '../../../shared/src/llm/types.js';

// Mock the SDK modules
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const MockAnthropic = vi.fn(() => ({
    messages: {
      create: mockCreate,
    },
  }));
  MockAnthropic.mockCreate = mockCreate;
  return { default: MockAnthropic };
});

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
  return { default: MockOpenAI };
});

describe('LLM Error Handling', () => {
  let mockAnthropicCreate: ReturnType<typeof vi.fn>;
  let mockOpenAICreate: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const AnthropicClass = vi.mocked(await import('@anthropic-ai/sdk')).default as unknown as {
      mockCreate: ReturnType<typeof vi.fn>;
    };
    mockAnthropicCreate = AnthropicClass.mockCreate;

    const OpenAIClass = vi.mocked(await import('openai')).default as unknown as {
      mockCreate: ReturnType<typeof vi.fn>;
    };
    mockOpenAICreate = OpenAIClass.mockCreate;
  });

  describe('Anthropic error handling', () => {
    let generator: AnthropicServerConfigGenerator;

    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
      };
      generator = new AnthropicServerConfigGenerator(config);
    });

    it('should handle network timeout errors', async () => {
      mockAnthropicCreate.mockRejectedValue(new Error('Request timeout'));

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Anthropic server config generation failed/);
    });

    it('should handle API rate limiting errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded') as Error & { status: number };
      rateLimitError.status = 429;
      mockAnthropicCreate.mockRejectedValue(rateLimitError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Anthropic server config generation failed/);
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Invalid API key') as Error & { status: number };
      authError.status = 401;
      mockAnthropicCreate.mockRejectedValue(authError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Anthropic server config generation failed/);
    });

    it('should handle malformed API responses', async () => {
      mockAnthropicCreate.mockResolvedValue({
        // Missing content array
        invalid: 'response',
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle empty content blocks', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [],
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle non-text content blocks', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'image',
            source: { type: 'base64', data: 'invalid' },
          },
        ],
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle truncated JSON in responses', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '<config>{"mcpServers": {"incomplete": {</config>',
          },
        ],
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('OpenAI error handling', () => {
    let generator: OpenAIServerConfigGenerator;

    beforeEach(() => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
      };
      generator = new OpenAIServerConfigGenerator(config);
    });

    it('should handle network errors', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('Network connection failed'));

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'OpenAI server config generation failed: Network connection failed'
      );
    });

    it('should handle quota exceeded errors', async () => {
      const quotaError = new Error('You exceeded your current quota') as Error & { status: number };
      quotaError.status = 429;
      mockOpenAICreate.mockRejectedValue(quotaError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('You exceeded your current quota');
    });

    it('should handle model not available errors', async () => {
      const modelError = new Error('Model not found') as Error & { status: number };
      modelError.status = 404;
      mockOpenAICreate.mockRejectedValue(modelError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Model not found');
    });

    it('should handle empty choices in response', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [],
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from OpenAI response');
    });

    it('should handle null message content', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from OpenAI response');
    });

    it('should handle malformed choice structure', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            // Missing message
            invalid: 'structure',
          },
        ],
      });

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await generator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No content generated from OpenAI response');
    });
  });

  describe('Factory error handling', () => {
    it('should handle invalid provider gracefully', () => {
      const config = {
        provider: 'invalid-provider',
        apiKey: 'test-key',
      } as LLMConfig;

      expect(() => ServerConfigGeneratorFactory.create(config)).toThrow(
        'Unsupported LLM provider: invalid-provider'
      );
    });

    it('should handle null/undefined config gracefully', () => {
      expect(() => ServerConfigGeneratorFactory.create(null as unknown as LLMConfig)).toThrow();
      expect(() =>
        ServerConfigGeneratorFactory.create(undefined as unknown as LLMConfig)
      ).toThrow();
    });

    it('should handle config with missing fields', () => {
      const incompleteConfig = { provider: 'anthropic' } as LLMConfig;

      expect(() => ServerConfigGeneratorFactory.create(incompleteConfig)).toThrow(
        'Anthropic API key is required'
      );
    });
  });

  describe('Input validation errors', () => {
    let anthropicGenerator: AnthropicServerConfigGenerator;
    let openaiGenerator: OpenAIServerConfigGenerator;

    beforeEach(() => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };
      anthropicGenerator = new AnthropicServerConfigGenerator(anthropicConfig);

      const openaiConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };
      openaiGenerator = new OpenAIServerConfigGenerator(openaiConfig);
    });

    it('should handle null/undefined input for Anthropic', async () => {
      // The current implementation will try to JSON.stringify null inputs
      // Mock a scenario where this causes an issue
      mockAnthropicCreate.mockRejectedValue(new Error('Invalid input processing'));

      const result = await anthropicGenerator.generateServerConfig(
        null as unknown as ServerConfigInput
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/server config generation failed/);
    });

    it('should handle null/undefined input for OpenAI', async () => {
      // The current implementation will try to JSON.stringify null inputs
      mockOpenAICreate.mockRejectedValue(new Error('Invalid input processing'));

      const result = await openaiGenerator.generateServerConfig(
        null as unknown as ServerConfigInput
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/server config generation failed/);
    });

    it('should handle extremely large input objects', async () => {
      // Create a very large server config
      const largeConfig = {
        name: 'test-server',
        description: 'A'.repeat(1000), // Large but not extreme description
        packages: Array(10).fill({
          type: 'npm',
          name: 'large-package',
        }),
      };

      const input: ServerConfigInput = {
        serverConfig: largeConfig,
      };

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '<config>{"mcpServers": {"test-server": {"command": "npx"}}}</config>\n\n<explanation>Generated config for large input</explanation>',
          },
        ],
      });

      const result = await anthropicGenerator.generateServerConfig(input);
      expect(result.success).toBe(true);
      expect(result.mcpConfig).toBeDefined();
    });
  });

  describe('Timeout and abort handling', () => {
    let anthropicGenerator: AnthropicServerConfigGenerator;
    let openaiGenerator: OpenAIServerConfigGenerator;

    beforeEach(() => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };
      anthropicGenerator = new AnthropicServerConfigGenerator(anthropicConfig);

      const openaiConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };
      openaiGenerator = new OpenAIServerConfigGenerator(openaiConfig);
    });

    it('should handle operation timeout for Anthropic', async () => {
      const timeoutError = new Error('Request timed out') as Error & { code: string };
      timeoutError.code = 'TIMEOUT';
      mockAnthropicCreate.mockRejectedValue(timeoutError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await anthropicGenerator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/server config generation failed/);
    });

    it('should handle operation timeout for OpenAI', async () => {
      const timeoutError = new Error('Request timed out') as Error & { code: string };
      timeoutError.code = 'TIMEOUT';
      mockOpenAICreate.mockRejectedValue(timeoutError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await openaiGenerator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request timed out');
    });
  });

  describe('Resource exhaustion scenarios', () => {
    let anthropicGenerator: AnthropicServerConfigGenerator;

    beforeEach(() => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };
      anthropicGenerator = new AnthropicServerConfigGenerator(anthropicConfig);
    });

    it('should handle memory errors gracefully', async () => {
      const memoryError = new Error('JavaScript heap out of memory');
      mockAnthropicCreate.mockRejectedValue(memoryError);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await anthropicGenerator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/server config generation failed/);
    });

    it('should handle unexpected error types', async () => {
      // Throw a non-Error object
      mockAnthropicCreate.mockRejectedValue('String error');

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await anthropicGenerator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/server config generation failed/);
    });

    it('should handle null/undefined thrown errors', async () => {
      mockAnthropicCreate.mockRejectedValue(null);

      const input: ServerConfigInput = {
        serverConfig: { name: 'test-server' },
      };

      const result = await anthropicGenerator.generateServerConfig(input);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/server config generation failed/);
    });
  });
});
