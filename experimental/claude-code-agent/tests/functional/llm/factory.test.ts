import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerConfigGeneratorFactory } from '../../../shared/src/llm/factory.js';
import { AnthropicServerConfigGenerator } from '../../../shared/src/llm/anthropic-client.js';
import { OpenAIServerConfigGenerator } from '../../../shared/src/llm/openai-client.js';
import type { LLMConfig } from '../../../shared/src/llm/types.js';

describe('ServerConfigGeneratorFactory', () => {
  // Store original env vars to restore later
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment variables
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_API_KEY;
    delete process.env.LLM_MODEL;
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('createFromEnv', () => {
    it('should return null when no environment configuration is found', () => {
      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeNull();
    });

    it('should return null when LLM_PROVIDER is missing', () => {
      process.env.LLM_API_KEY = 'test-api-key';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeNull();
    });

    it('should return null when LLM_API_KEY is missing', () => {
      process.env.LLM_PROVIDER = 'anthropic';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeNull();
    });

    it('should create AnthropicServerConfigGenerator for anthropic provider', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-anthropic-key';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
    });

    it('should create OpenAIServerConfigGenerator for openai provider', () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.LLM_API_KEY = 'test-openai-key';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(OpenAIServerConfigGenerator);
    });

    it('should pass LLM_MODEL to the generator config', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_MODEL = 'claude-sonnet-4-5-20250929';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
    });
  });

  describe('create', () => {
    it('should create AnthropicServerConfigGenerator for anthropic provider', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
      };

      const generator = ServerConfigGeneratorFactory.create(config);
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
    });

    it('should create OpenAIServerConfigGenerator for openai provider', () => {
      const config: LLMConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      const generator = ServerConfigGeneratorFactory.create(config);
      expect(generator).toBeInstanceOf(OpenAIServerConfigGenerator);
    });

    it('should throw error for unsupported provider', () => {
      const config = {
        provider: 'unsupported',
        apiKey: 'test-key',
      } as LLMConfig;

      expect(() => ServerConfigGeneratorFactory.create(config)).toThrow(
        'Unsupported LLM provider: unsupported'
      );
    });

    it('should pass model configuration to generators', () => {
      const config: LLMConfig = {
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'custom-model',
      };

      const generator = ServerConfigGeneratorFactory.create(config);
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
    });
  });

  describe('isAvailable', () => {
    it('should return false when no environment configuration exists', () => {
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);
    });

    it('should return false when only LLM_PROVIDER is set', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);
    });

    it('should return false when only LLM_API_KEY is set', () => {
      process.env.LLM_API_KEY = 'test-key';
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);
    });

    it('should return true when both LLM_PROVIDER and LLM_API_KEY are set', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-key';
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(true);
    });

    it('should return true for different valid provider combinations', () => {
      process.env.LLM_PROVIDER = 'openai';
      process.env.LLM_API_KEY = 'test-key';
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(true);
    });
  });
});
