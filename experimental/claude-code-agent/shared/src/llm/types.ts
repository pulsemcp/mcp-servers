/**
 * Types for the LLM-based server configuration generation functionality
 */

/**
 * Configuration for LLM providers
 */
export interface LLMConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
}

/**
 * Options for server configuration generation
 */
export interface ServerConfigGenerationOptions {
  maxRetries?: number;
  timeout?: number;
  includeOptionalFields?: boolean;
}

/**
 * Input for server configuration generation
 */
export interface ServerConfigInput {
  /** The server.json configuration to convert */
  serverConfig: Record<string, unknown>;
  /** Optional user preferences for the configuration */
  userPreferences?: {
    serverName?: string;
    includeEnvironmentVariables?: boolean;
    customArgs?: string[];
    workingDirectory?: string;
  };
}

/**
 * Result of server configuration generation
 */
export interface ServerConfigGenerationResult {
  success: boolean;
  /** Generated .mcp.json configuration */
  mcpConfig?: Record<string, unknown>;
  /** Human-readable explanation of the configuration */
  explanation?: string;
  error?: string;
}

/**
 * Interface for server configuration generation clients
 */
export interface IServerConfigGenerator {
  /**
   * Generate an .mcp.json configuration from a server.json configuration
   * @param input The server configuration and preferences
   * @param options Optional generation options
   * @returns The generated MCP configuration or an error
   */
  generateServerConfig(
    input: ServerConfigInput,
    options?: ServerConfigGenerationOptions
  ): Promise<ServerConfigGenerationResult>;
}
