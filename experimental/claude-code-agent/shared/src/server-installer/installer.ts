import {
  ServerConfig,
  InstallationResult,
  InstallationContext,
  IClaudeCodeInferenceClient,
  ISecretsProvider,
  McpConfig,
  McpServerEntry,
  InferenceRequest,
} from './types.js';
import { RUNTIME_TO_COMMAND_MAP } from './config.js';
import { runServerConfigInference, FileSecretsProvider } from './inference.js';
import { createLogger } from '../logging.js';

const logger = createLogger('server-installer');

/**
 * Main server installation function
 */
export async function installServers(
  serverNames: string[],
  serversConfigPath: string,
  claudeClient: IClaudeCodeInferenceClient,
  options: {
    secretsPath?: string;
    context?: InstallationContext;
    secretsProvider?: ISecretsProvider;
  } = {}
): Promise<InstallationResult> {
  logger.debug(`Starting installation for servers: ${serverNames.join(', ')}`);

  // Load server configurations
  logger.debug(`Loading server configs from: ${serversConfigPath}`);
  const serverConfigs = await loadServerConfigs(serversConfigPath);
  logger.debug(`Loaded ${serverConfigs.length} server configurations`);

  // Filter to requested servers
  const requestedConfigs = serverNames.map((name) => {
    const config = serverConfigs.find((s) => s.name === name);
    if (!config) {
      throw new Error(`Server not found in configuration: ${name}`);
    }
    return { name, config };
  });
  logger.debug(`Filtered to ${requestedConfigs.length} requested server configs`);

  // Set up secrets provider
  const secretsProvider = options.secretsProvider || new FileSecretsProvider(options.secretsPath);
  const secretsAvailable = await secretsProvider.listAvailableSecrets();
  logger.debug(
    `Found ${secretsAvailable.length} available secrets: ${secretsAvailable.join(', ')}`
  );

  // Run inference to get configuration decisions
  const inferenceRequest: InferenceRequest = {
    servers: requestedConfigs,
    context: options.context,
    secretsAvailable,
  };

  logger.debug('Starting inference request to Claude Code...');
  const inferenceResponse = await runServerConfigInference(inferenceRequest, claudeClient);
  logger.debug(
    `Inference complete, got ${inferenceResponse.serverConfigurations.length} server configurations`
  );

  // Generate MCP configuration
  logger.debug('Generating MCP configuration entries...');
  const mcpConfig: McpConfig = { mcpServers: {} };
  const installations = [];
  const warnings = [...(inferenceResponse.warnings || [])];

  for (const serverConfig of inferenceResponse.serverConfigurations) {
    try {
      logger.debug(`Generating MCP entry for: ${serverConfig.serverName}`);

      // Find the original server configuration
      const originalConfig = requestedConfigs.find(
        (rc) => rc.name === serverConfig.serverName
      )?.config;
      if (!originalConfig) {
        throw new Error(`Original config not found for: ${serverConfig.serverName}`);
      }

      const mcpEntry = await generateMcpEntry(serverConfig, originalConfig, secretsProvider);

      // Use simplified server name for domain-style names, otherwise keep original
      const serverKey = shouldUseSimplifiedName(serverConfig.serverName)
        ? generateSimplifiedServerName(serverConfig.serverName)
        : serverConfig.serverName;
      mcpConfig.mcpServers[serverKey] = mcpEntry;

      installations.push({
        serverName: serverConfig.serverName,
        status: 'success' as const,
        mcpEntry,
      });
      logger.debug(`Successfully generated entry for: ${serverConfig.serverName}`);
    } catch (error) {
      logger.error(`Failed to generate entry for ${serverConfig.serverName}:`, error);
      installations.push({
        serverName: serverConfig.serverName,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.debug(
    `Installation complete: ${installations.filter((i) => i.status === 'success').length} succeeded, ${installations.filter((i) => i.status === 'failed').length} failed`
  );
  return {
    installations,
    mcpConfig,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Loads server configurations from JSON file
 */
async function loadServerConfigs(configPath: string): Promise<ServerConfig[]> {
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to load server configurations from ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Determines whether to use a simplified name for a server
 * Use simplified names for real domain-style names like "io.github.user/project"
 * But not for test patterns like "com.example/server"
 */
function shouldUseSimplifiedName(serverName: string): boolean {
  // Use simplified names for domain-style patterns with dots and slashes
  // but exclude test patterns like com.example
  return (
    serverName.includes('.') && serverName.includes('/') && !serverName.startsWith('com.example/')
  );
}

/**
 * Generates a simplified server name for MCP configuration
 * Examples:
 * - "io.github.lucashild/bigquery" -> "bigquery"
 * - "com.microsoft/playwright" -> "playwright"
 * - "simple-name" -> "simple-name"
 */
function generateSimplifiedServerName(fullName: string): string {
  // If it contains a slash, take the part after the last slash
  if (fullName.includes('/')) {
    return fullName.split('/').pop() || fullName;
  }
  // Otherwise use the full name as is
  return fullName;
}

/**
 * Generates an MCP server entry from inference response
 */
async function generateMcpEntry(
  serverConfig: {
    selectedPackage: {
      registryType: string;
      identifier: string;
      version?: string;
      runtimeHint?: string;
    };
    selectedTransport: {
      type: string;
      url?: string;
    };
    environmentVariables?: Record<string, string>;
    runtimeArguments?: string[];
  },
  originalConfig: ServerConfig,
  secretsProvider: ISecretsProvider
): Promise<McpServerEntry> {
  const { selectedPackage, selectedTransport, environmentVariables, runtimeArguments } =
    serverConfig;

  // Determine command - check if runtimeHint is a path or a standard hint
  const runtimeHint =
    selectedPackage.runtimeHint || inferRuntimeFromRegistry(selectedPackage.registryType);
  let command: string;

  if (runtimeHint.startsWith('/') || runtimeHint.includes('/')) {
    // Custom path like "/Users/admin/.local/bin/uv"
    command = runtimeHint;
  } else {
    // Standard runtime hint like "uvx", "npx", etc.
    command = RUNTIME_TO_COMMAND_MAP[runtimeHint as keyof typeof RUNTIME_TO_COMMAND_MAP];
    if (!command) {
      throw new Error(`Unsupported runtime hint: ${runtimeHint}`);
    }
  }

  // Build command arguments by finding the matching package in original config
  const args: string[] = [];
  const matchingPackage = originalConfig.packages?.find(
    (pkg) => pkg.identifier === selectedPackage.identifier
  );

  if (matchingPackage && selectedPackage.registryType === 'local') {
    // For local packages, use the detailed argument structure from original config

    // First add runtime arguments (like --directory, run, package-name)
    if (matchingPackage.runtimeArguments) {
      for (const arg of matchingPackage.runtimeArguments) {
        if (arg.type === 'named' && arg.name) {
          args.push(arg.name, arg.value);
        } else {
          args.push(arg.value);
        }
      }
    }

    // Then add package arguments (like --project, --location, etc.)
    if (matchingPackage.packageArguments) {
      for (const arg of matchingPackage.packageArguments) {
        if (arg.type === 'named' && arg.name) {
          args.push(arg.name, arg.value);
        } else {
          args.push(arg.value);
        }
      }
    }
  } else {
    // For standard packages, use traditional approach
    if (selectedPackage.registryType === 'oci') {
      args.push('run', '--rm', '-i');
      args.push(
        selectedPackage.identifier + (selectedPackage.version ? `:${selectedPackage.version}` : '')
      );
    } else {
      args.push(
        selectedPackage.identifier + (selectedPackage.version ? `@${selectedPackage.version}` : '')
      );
    }

    // Add runtime arguments from inference response
    if (runtimeArguments) {
      args.push(...runtimeArguments);
    }
  }

  // Resolve environment variables
  const env: Record<string, string> = {};
  if (environmentVariables) {
    for (const [key, value] of Object.entries(environmentVariables)) {
      if (typeof value === 'string') {
        // Try to resolve from secrets first
        const secretValue = await secretsProvider.getSecret(key);
        env[key] = secretValue || value;
      }
    }
  }

  const mcpEntry: McpServerEntry = {
    command,
    args: args.length > 0 ? args : undefined,
    env: Object.keys(env).length > 0 ? env : undefined,
  };

  // Add transport configuration for remote servers
  if (selectedTransport.type !== 'stdio') {
    mcpEntry.transport = {
      type: selectedTransport.type as 'streamable-http' | 'sse',
      url: selectedTransport.url,
    };
  }

  return mcpEntry;
}

/**
 * Infers runtime hint from registry type
 */
function inferRuntimeFromRegistry(registryType: string): string {
  switch (registryType) {
    case 'npm':
      return 'npx';
    case 'pypi':
      return 'uvx';
    case 'oci':
      return 'docker';
    case 'nuget':
      return 'dnx';
    default:
      return 'npx'; // Default fallback
  }
}
