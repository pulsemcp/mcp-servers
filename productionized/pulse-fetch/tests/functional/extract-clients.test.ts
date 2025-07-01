import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AnthropicExtractClient,
  OpenAIExtractClient,
  OpenAICompatibleExtractClient,
  ExtractClientFactory,
  type LLMConfig,
} from '../../shared/src/extract/index.js';

// Mock the SDK modules
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn(),
      },
    })),
  };
});

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    })),
  };
});

describe('Extract Clients', () => {
  const mockContent = '<html><body><h1>Test Article</h1><p>This is test content.</p></body></html>';
  const mockQuery = 'Extract the article title';

  describe('AnthropicExtractClient', () => {
    it('should extract content successfully', async () => {
      const mockAnthropicModule = await import('@anthropic-ai/sdk');
      const AnthropicMock = mockAnthropicModule.default as ReturnType<typeof vi.fn>;

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test Article' }],
      });

      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
      };

      const client = new AnthropicExtractClient(config);
      const result = await client.extract(mockContent, mockQuery);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test Article');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0,
        system: expect.stringContaining('expert at extracting'),
        messages: [
          {
            role: 'user',
            content: expect.stringContaining(mockContent),
          },
        ],
      });
    });

    it('should handle extraction errors', async () => {
      const mockAnthropicModule = await import('@anthropic-ai/sdk');
      const AnthropicMock = mockAnthropicModule.default as ReturnType<typeof vi.fn>;

      const mockCreate = vi.fn().mockRejectedValue(new Error('API Error'));

      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
      };

      const client = new AnthropicExtractClient(config);
      const result = await client.extract(mockContent, mockQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Anthropic extraction failed: API Error');
    });

    it('should use custom model if provided', async () => {
      const mockAnthropicModule = await import('@anthropic-ai/sdk');
      const AnthropicMock = mockAnthropicModule.default as ReturnType<typeof vi.fn>;

      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Test Article' }],
      });

      AnthropicMock.mockImplementation(() => ({
        messages: {
          create: mockCreate,
        },
      }));

      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-api-key',
        model: 'claude-3-opus-20240229',
      };

      const client = new AnthropicExtractClient(config);
      await client.extract(mockContent, mockQuery);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
        })
      );
    });
  });

  describe('OpenAIExtractClient', () => {
    it('should extract content successfully', async () => {
      const mockOpenAIModule = await import('openai');
      const OpenAIMock = mockOpenAIModule.default as ReturnType<typeof vi.fn>;

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test Article' } }],
      });

      OpenAIMock.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
      };

      const client = new OpenAIExtractClient(config);
      const result = await client.extract(mockContent, mockQuery);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test Article');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4.1-mini',
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('expert at extracting'),
          },
          {
            role: 'user',
            content: expect.stringContaining(mockContent),
          },
        ],
      });
    });

    it('should handle empty response', async () => {
      const mockOpenAIModule = await import('openai');
      const OpenAIMock = mockOpenAIModule.default as ReturnType<typeof vi.fn>;

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      OpenAIMock.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
      };

      const client = new OpenAIExtractClient(config);
      const result = await client.extract(mockContent, mockQuery);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No content extracted from OpenAI response');
    });
  });

  describe('OpenAICompatibleExtractClient', () => {
    it('should extract content successfully with custom base URL', async () => {
      const mockOpenAIModule = await import('openai');
      const OpenAIMock = mockOpenAIModule.default as ReturnType<typeof vi.fn>;

      const mockCreate = vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'Test Article' } }],
      });

      OpenAIMock.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const config: LLMConfig = {
        provider: 'openai-compatible',
        apiKey: 'test-api-key',
        model: 'llama-3-70b',
        apiBaseUrl: 'https://api.together.xyz/v1',
      };

      const client = new OpenAICompatibleExtractClient(config);
      const result = await client.extract(mockContent, mockQuery);

      expect(result.success).toBe(true);
      expect(result.content).toBe('Test Article');
      expect(OpenAIMock).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        baseURL: 'https://api.together.xyz/v1',
      });
    });

    it('should require base URL', () => {
      const config: LLMConfig = {
        provider: 'openai-compatible',
        apiKey: 'test-api-key',
        model: 'llama-3-70b',
      };

      expect(() => new OpenAICompatibleExtractClient(config)).toThrow(
        'API base URL is required for OpenAI-compatible provider'
      );
    });

    it('should require model name', () => {
      const config: LLMConfig = {
        provider: 'openai-compatible',
        apiKey: 'test-api-key',
        apiBaseUrl: 'https://api.together.xyz/v1',
      };

      expect(() => new OpenAICompatibleExtractClient(config)).toThrow(
        'Model name is required for OpenAI-compatible provider'
      );
    });
  });

  describe('ExtractClientFactory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create client from environment variables', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_MODEL = 'claude-3-opus-20240229';

      const client = ExtractClientFactory.createFromEnv();
      expect(client).toBeInstanceOf(AnthropicExtractClient);
    });

    it('should return null if no environment config', () => {
      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;

      const client = ExtractClientFactory.createFromEnv();
      expect(client).toBeNull();
    });

    it('should check availability correctly', () => {
      delete process.env.LLM_PROVIDER;
      delete process.env.LLM_API_KEY;
      expect(ExtractClientFactory.isAvailable()).toBe(false);

      process.env.LLM_PROVIDER = 'openai';
      process.env.LLM_API_KEY = 'test-key';
      expect(ExtractClientFactory.isAvailable()).toBe(true);
    });

    it('should create correct client type based on provider', () => {
      const anthropicConfig: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };
      expect(ExtractClientFactory.create(anthropicConfig)).toBeInstanceOf(AnthropicExtractClient);

      const openaiConfig: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };
      expect(ExtractClientFactory.create(openaiConfig)).toBeInstanceOf(OpenAIExtractClient);

      const compatibleConfig: LLMConfig = {
        provider: 'openai-compatible',
        apiKey: 'test-key',
        model: 'test-model',
        apiBaseUrl: 'https://api.test.com',
      };
      expect(ExtractClientFactory.create(compatibleConfig)).toBeInstanceOf(
        OpenAICompatibleExtractClient
      );
    });
  });
});
