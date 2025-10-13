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

      // Use full server name
      mcpConfig.mcpServers[serverConfig.serverName] = mcpEntry;

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

  // Use runtimeHint directly as command, or infer from registry type
  const command =
    selectedPackage.runtimeHint || inferRuntimeFromRegistry(selectedPackage.registryType);

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

  // Only include environment variables if we have secrets available
  const env: Record<string, string> = {};
  if (environmentVariables) {
    const availableSecrets = await secretsProvider.listAvailableSecrets();
    for (const [key, value] of Object.entries(environmentVariables)) {
      if (typeof value === 'string') {
        // Only include env vars if the secret is actually available
        if (availableSecrets.includes(key)) {
          const secretValue = await secretsProvider.getSecret(key);
          if (secretValue) {
            env[key] = secretValue;
          } else {
            // Keep templated value if secret exists but is empty
            env[key] = value;
          }
        }
        // Skip env vars for which we don't have secrets
      }
    }
  }

  const mcpEntry: McpServerEntry = {
    type: 'stdio',
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
  const runtimeMap: Record<string, string> = {
    npm: 'npx',
    pypi: 'uvx',
    oci: 'docker',
    nuget: 'dnx',
  };
  return runtimeMap[registryType] || 'npx';
}
