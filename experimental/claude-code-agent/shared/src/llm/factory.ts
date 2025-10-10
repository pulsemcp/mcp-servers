import type { IServerConfigGenerator, LLMConfig } from './types.js';
import { AnthropicServerConfigGenerator } from './anthropic-client.js';
import { OpenAIServerConfigGenerator } from './openai-client.js';

/**
 * Factory for creating server configuration generation clients based on configuration
 */
export class ServerConfigGeneratorFactory {
  /**
   * Create a server config generator from environment variables
   * Returns null if no configuration is found
   */
  static createFromEnv(): IServerConfigGenerator | null {
    const provider = process.env.LLM_PROVIDER as LLMConfig['provider'] | undefined;
    const apiKey = process.env.LLM_API_KEY;

    if (!provider || !apiKey) {
      return null;
    }

    const config: LLMConfig = {
      provider,
      apiKey,
      model: process.env.LLM_MODEL,
    };

    return this.create(config);
  }

  /**
   * Create a server config generator from configuration
   */
  static create(config: LLMConfig): IServerConfigGenerator {
    switch (config.provider) {
      case 'anthropic':
        return new AnthropicServerConfigGenerator(config);
      case 'openai':
        return new OpenAIServerConfigGenerator(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Check if server config generation functionality is available
   * (either through environment configuration or MCP sampling)
   */
  static isAvailable(): boolean {
    // Check for environment configuration
    const hasEnvConfig = !!(process.env.LLM_PROVIDER && process.env.LLM_API_KEY);

    // TODO: Check for MCP sampling capability when implemented

    return hasEnvConfig;
  }
}
