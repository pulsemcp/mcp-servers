import type { IExtractClient, LLMConfig } from './types.js';
import { AnthropicExtractClient } from './anthropic-client.js';
import { OpenAIExtractClient } from './openai-client.js';
import { OpenAICompatibleExtractClient } from './openai-compatible-client.js';

/**
 * Factory for creating extract clients based on configuration
 */
export class ExtractClientFactory {
  /**
   * Create an extract client from environment variables
   * Returns null if no configuration is found
   */
  static createFromEnv(): IExtractClient | null {
    const provider = process.env.LLM_PROVIDER as LLMConfig['provider'] | undefined;
    const apiKey = process.env.LLM_API_KEY;

    if (!provider || !apiKey) {
      return null;
    }

    const config: LLMConfig = {
      provider,
      apiKey,
      model: process.env.LLM_MODEL,
      apiBaseUrl: process.env.LLM_API_BASE_URL,
    };

    return this.create(config);
  }

  /**
   * Create an extract client from configuration
   */
  static create(config: LLMConfig): IExtractClient {
    switch (config.provider) {
      case 'anthropic':
        return new AnthropicExtractClient(config);
      case 'openai':
        return new OpenAIExtractClient(config);
      case 'openai-compatible':
        return new OpenAICompatibleExtractClient(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Check if extract functionality is available
   * (either through environment configuration or MCP sampling)
   */
  static isAvailable(): boolean {
    // Check for environment configuration
    const hasEnvConfig = !!(process.env.LLM_PROVIDER && process.env.LLM_API_KEY);

    // TODO: Check for MCP sampling capability when implemented

    return hasEnvConfig;
  }
}
