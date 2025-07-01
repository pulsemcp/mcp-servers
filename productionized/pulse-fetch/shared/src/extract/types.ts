/**
 * Types for the extract functionality
 */

/**
 * Configuration for LLM providers
 */
export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'openai-compatible';
  apiKey: string;
  model?: string;
  apiBaseUrl?: string; // For OpenAI-compatible providers
}

/**
 * Options for extraction
 */
export interface ExtractOptions {
  maxRetries?: number;
  timeout?: number;
}

/**
 * Result of an extraction
 */
export interface ExtractResult {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Interface for extract clients
 */
export interface IExtractClient {
  /**
   * Extract information from content using a natural language query
   * @param content The content to extract from (typically HTML or text)
   * @param query The natural language query describing what to extract
   * @param options Optional extraction options
   * @returns The extracted information or an error
   */
  extract(content: string, query: string, options?: ExtractOptions): Promise<ExtractResult>;
}
