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
  // Load server configurations
  const serverConfigs = await loadServerConfigs(serversConfigPath);

  // Filter to requested servers
  const requestedConfigs = serverNames.map((name) => {
    const config = serverConfigs.find((s) => s.name === name);
    if (!config) {
      throw new Error(`Server not found in configuration: ${name}`);
    }
    return { name, config };
  });

  // Set up secrets provider
  const secretsProvider = options.secretsProvider || new FileSecretsProvider(options.secretsPath);
  const secretsAvailable = await secretsProvider.listAvailableSecrets();

  // Run inference to get configuration decisions
  const inferenceRequest: InferenceRequest = {
    servers: requestedConfigs,
    context: options.context,
    secretsAvailable,
  };

  const inferenceResponse = await runServerConfigInference(inferenceRequest, claudeClient);

  // Generate MCP configuration
  const mcpConfig: McpConfig = { mcpServers: {} };
  const installations = [];
  const warnings = [...(inferenceResponse.warnings || [])];

  for (const serverConfig of inferenceResponse.serverConfigurations) {
    try {
      const mcpEntry = await generateMcpEntry(serverConfig, secretsProvider);
      mcpConfig.mcpServers[serverConfig.serverName] = mcpEntry;

      installations.push({
        serverName: serverConfig.serverName,
        status: 'success' as const,
        mcpEntry,
      });
    } catch (error) {
      installations.push({
        serverName: serverConfig.serverName,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

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
  secretsProvider: ISecretsProvider
): Promise<McpServerEntry> {
  const { selectedPackage, selectedTransport, environmentVariables, runtimeArguments } =
    serverConfig;

  // Determine command based on runtime hint
  const runtimeHint =
    selectedPackage.runtimeHint || inferRuntimeFromRegistry(selectedPackage.registryType);
  const command = RUNTIME_TO_COMMAND_MAP[runtimeHint as keyof typeof RUNTIME_TO_COMMAND_MAP];

  if (!command) {
    throw new Error(`Unsupported runtime hint: ${runtimeHint}`);
  }

  // Build command arguments
  const args = [];

  // Add package identifier
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

  // Add runtime arguments
  if (runtimeArguments) {
    args.push(...runtimeArguments);
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
