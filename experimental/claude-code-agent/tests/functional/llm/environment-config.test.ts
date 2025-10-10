import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerConfigGeneratorFactory } from '../../../shared/src/llm/factory.js';
import { AnthropicServerConfigGenerator } from '../../../shared/src/llm/anthropic-client.js';
import { OpenAIServerConfigGenerator } from '../../../shared/src/llm/openai-client.js';

describe('LLM Environment Configuration', () => {
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

  describe('Environment variable validation', () => {
    it('should require both LLM_PROVIDER and LLM_API_KEY for availability', () => {
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);

      process.env.LLM_PROVIDER = 'anthropic';
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);

      process.env.LLM_API_KEY = 'test-key';
      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(true);
    });

    it('should handle empty string environment variables', () => {
      process.env.LLM_PROVIDER = '';
      process.env.LLM_API_KEY = '';

      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);
      expect(ServerConfigGeneratorFactory.createFromEnv()).toBeNull();
    });

    it('should handle whitespace-only environment variables', () => {
      process.env.LLM_PROVIDER = '  ';
      process.env.LLM_API_KEY = '  ';

      // Factory should consider whitespace as invalid provider
      expect(() => {
        ServerConfigGeneratorFactory.createFromEnv();
      }).toThrow('Unsupported LLM provider:   ');
    });

    it('should be case-sensitive for provider names', () => {
      process.env.LLM_PROVIDER = 'ANTHROPIC'; // uppercase
      process.env.LLM_API_KEY = 'test-key';

      expect(() => {
        ServerConfigGeneratorFactory.createFromEnv();
      }).toThrow('Unsupported LLM provider: ANTHROPIC');
    });
  });

  describe('Provider-specific configuration', () => {
    describe('Anthropic configuration', () => {
      it('should create Anthropic generator with default model', () => {
        process.env.LLM_PROVIDER = 'anthropic';
        process.env.LLM_API_KEY = 'sk-ant-test-key';

        const generator = ServerConfigGeneratorFactory.createFromEnv();
        expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
      });

      it('should create Anthropic generator with custom model', () => {
        process.env.LLM_PROVIDER = 'anthropic';
        process.env.LLM_API_KEY = 'sk-ant-test-key';
        process.env.LLM_MODEL = 'claude-sonnet-3-5-20241022';

        const generator = ServerConfigGeneratorFactory.createFromEnv();
        expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
      });

      it('should handle Anthropic API key formats', () => {
        const validApiKeys = [
          'sk-ant-api03-1234567890abcdef',
          'sk-ant-test-key',
          'anthropic-api-key-format',
        ];

        validApiKeys.forEach((apiKey) => {
          process.env.LLM_PROVIDER = 'anthropic';
          process.env.LLM_API_KEY = apiKey;

          expect(() => ServerConfigGeneratorFactory.createFromEnv()).not.toThrow();
        });
      });
    });

    describe('OpenAI configuration', () => {
      it('should create OpenAI generator with default model', () => {
        process.env.LLM_PROVIDER = 'openai';
        process.env.LLM_API_KEY = 'sk-test-key';

        const generator = ServerConfigGeneratorFactory.createFromEnv();
        expect(generator).toBeInstanceOf(OpenAIServerConfigGenerator);
      });

      it('should create OpenAI generator with custom model', () => {
        process.env.LLM_PROVIDER = 'openai';
        process.env.LLM_API_KEY = 'sk-test-key';
        process.env.LLM_MODEL = 'gpt-4';

        const generator = ServerConfigGeneratorFactory.createFromEnv();
        expect(generator).toBeInstanceOf(OpenAIServerConfigGenerator);
      });

      it('should handle OpenAI API key formats', () => {
        const validApiKeys = [
          'sk-1234567890abcdef',
          'sk-proj-1234567890abcdef',
          'sk-org-1234567890abcdef',
        ];

        validApiKeys.forEach((apiKey) => {
          process.env.LLM_PROVIDER = 'openai';
          process.env.LLM_API_KEY = apiKey;

          expect(() => ServerConfigGeneratorFactory.createFromEnv()).not.toThrow();
        });
      });
    });
  });

  describe('Model configuration', () => {
    it('should pass model configuration to generators', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_MODEL = 'custom-model';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);

      // The model is passed internally but we can't easily test it without
      // exposing internals. This test documents the expected behavior.
    });

    it('should handle undefined model gracefully', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-key';
      // LLM_MODEL is undefined

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
    });

    it('should handle empty model string', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'test-key';
      process.env.LLM_MODEL = '';

      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);
    });
  });

  describe('Multiple environment scenarios', () => {
    it('should work in Docker environment with common variable patterns', () => {
      // Common Docker environment setup
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'sk-ant-api03-docker-test-key';
      process.env.NODE_ENV = 'production';
      process.env.PORT = '3000';

      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(true);
      expect(ServerConfigGeneratorFactory.createFromEnv()).toBeInstanceOf(
        AnthropicServerConfigGenerator
      );
    });

    it('should work in development environment with local variables', () => {
      // Common development setup
      process.env.LLM_PROVIDER = 'openai';
      process.env.LLM_API_KEY = 'sk-dev-test-key';
      process.env.LLM_MODEL = 'gpt-4o-mini';
      process.env.NODE_ENV = 'development';

      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(true);
      expect(ServerConfigGeneratorFactory.createFromEnv()).toBeInstanceOf(
        OpenAIServerConfigGenerator
      );
    });

    it('should handle switching between providers', () => {
      // First, Anthropic
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'anthropic-key';

      let generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(AnthropicServerConfigGenerator);

      // Switch to OpenAI
      process.env.LLM_PROVIDER = 'openai';
      process.env.LLM_API_KEY = 'openai-key';

      generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeInstanceOf(OpenAIServerConfigGenerator);
    });
  });

  describe('Error handling for environment issues', () => {
    it('should handle process.env being undefined', () => {
      // Simulate edge case where process.env might be modified
      const originalProcessEnv = process.env;
      try {
        (process as { env: NodeJS.ProcessEnv }).env = {};

        expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);
        expect(ServerConfigGeneratorFactory.createFromEnv()).toBeNull();
      } finally {
        process.env = originalProcessEnv;
      }
    });

    it('should handle non-string environment variable values', () => {
      // This is unlikely but we should handle it gracefully
      (process.env as Record<string, unknown>).LLM_PROVIDER = null;
      (process.env as Record<string, unknown>).LLM_API_KEY = undefined;

      expect(ServerConfigGeneratorFactory.isAvailable()).toBe(false);
      expect(ServerConfigGeneratorFactory.createFromEnv()).toBeNull();
    });
  });

  describe('Configuration precedence', () => {
    it('should prioritize environment variables over defaults', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'env-key';

      // Environment configuration should take precedence
      const generator = ServerConfigGeneratorFactory.createFromEnv();
      expect(generator).toBeTruthy();
    });

    it('should handle conflicting or invalid combinations gracefully', () => {
      process.env.LLM_PROVIDER = 'anthropic';
      process.env.LLM_API_KEY = 'openai-style-key'; // Potentially confusing but valid

      // Should still work - the factory doesn't validate key formats
      expect(() => ServerConfigGeneratorFactory.createFromEnv()).not.toThrow();
    });
  });
});
