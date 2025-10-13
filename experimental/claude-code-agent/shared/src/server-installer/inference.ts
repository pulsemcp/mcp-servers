import {
  InferenceRequest,
  InferenceResponse,
  InferenceResponseSchema,
  IClaudeCodeInferenceClient,
  ISecretsProvider,
  ServerConfig,
} from './types.js';
import { DEFAULT_CONFIG } from './config.js';
import { createLogger } from '../logging.js';

const logger = createLogger('server-installer-inference');

/**
 * Generates an inference prompt for Claude to configure MCP servers
 */
export function generateInferencePrompt(request: InferenceRequest): string {
  const { servers, context, secretsAvailable = [] } = request;

  const prompt = `You are helping configure MCP servers for installation. Based on the server configurations and context provided, determine the optimal configuration for each server.

## Context
${context?.purpose ? `Purpose: ${context.purpose}` : 'Purpose: Server installation via claude-code-agent'}

## Available Secrets
${secretsAvailable.length > 0 ? secretsAvailable.map((s) => `- ${s}`).join('\n') : 'No secrets available'}

## Servers to Configure
${servers.map((s) => formatServerForPrompt(s.name, s.config)).join('\n\n')}

## Your Task
For each server, make decisions about:
1. **Package Selection**: Choose the best package from available options based on transport priorities: ${DEFAULT_CONFIG.transportPriorities.join(' > ')}
2. **Transport Type**: Select stdio, streamable-http, or sse 
3. **Runtime Selection**: Choose from runtime priorities: ${DEFAULT_CONFIG.runtimePriorities.join(' > ')}
4. **Environment Variables**: Set required and optional environment variables
   - For secrets that are available: use the actual secret value
   - For secrets that are NOT available: use template format \`\${SECRET_NAME}\` (e.g., \`\${API_KEY}\`)
   - Set reasonable defaults for non-sensitive configuration
   - Template variables will be resolved later during installation

## Response Format
Return a JSON object matching this exact structure:

**CRITICAL: Use these exact enum values:**
- **registryType**: Must be one of: "npm" (for Node.js), "pypi" (for Python), "oci" (for Docker), "nuget" (for .NET), "mcpb" (for MCP binaries)
- **runtimeHint**: Must be one of: "npx", "uvx", "docker", "dnx"
- **transport type**: Must be one of: "stdio", "streamable-http", "sse"

\`\`\`json
{
  "serverConfigurations": [
    {
      "serverName": "com.example/server",
      "selectedPackage": {
        "registryType": "npm",
        "identifier": "@example/mcp-server",
        "version": "latest",
        "runtimeHint": "npx"
      },
      "selectedTransport": {
        "type": "stdio"
      },
      "environmentVariables": {
        "API_KEY": "\${API_KEY}",
        "BASE_URL": "https://api.example.com",
        "TIMEOUT": "30000"
      },
      "runtimeArguments": ["--timeout", "30"],
      "rationale": "Selected npm package with stdio transport for best performance. Using npx runtime for Node.js compatibility."
    }
  ],
  "warnings": [
    "Server X requires API_KEY but no secret is available"
  ]
}
\`\`\`

## Important Guidelines
- Prefer local packages (stdio transport) over remote servers unless context suggests otherwise
- For environment variables that need secrets: use template format \`\${SECRET_NAME}\` if secret is not available
- Use actual secret values only when they are listed in "Available Secrets"
- Set reasonable defaults for timeouts, URLs, and other non-sensitive configuration
- Explain your reasoning in the rationale field
- Include warnings for missing required configuration`;

  return prompt;
}

/**
 * Formats a server configuration for the inference prompt
 */
function formatServerForPrompt(name: string, config: ServerConfig): string {
  let output = `### ${name}
Description: ${config.description}`;

  if (config.packages && config.packages.length > 0) {
    output += '\n\nAvailable Packages:';
    config.packages.forEach((pkg, i) => {
      output += `\n${i + 1}. **${pkg.registryType}**: ${pkg.identifier}${pkg.version ? `@${pkg.version}` : ''}`;
      if (pkg.runtimeHint) output += ` (runtime: ${pkg.runtimeHint})`;
      if (pkg.transport) output += ` (transport: ${pkg.transport.type})`;

      if (pkg.environmentVariables && pkg.environmentVariables.length > 0) {
        output += '\n   Environment Variables:';
        pkg.environmentVariables.forEach((env) => {
          const required = env.required !== false ? ' (required)' : ' (optional)';
          output += `\n   - ${env.name}${required}`;
          if (env.value) output += ` = ${env.value}`;
        });
      }
    });
  }

  if (config.remotes && config.remotes.length > 0) {
    output += '\n\nRemote Options:';
    config.remotes.forEach((remote, i) => {
      output += `\n${i + 1}. **${remote.type}**: ${remote.url}`;
    });
  }

  return output;
}

/**
 * Runs inference using Claude Code to determine server configurations
 */
export async function runServerConfigInference(
  request: InferenceRequest,
  claudeClient: IClaudeCodeInferenceClient
): Promise<InferenceResponse> {
  logger.debug('Generating inference prompt...');
  const prompt = generateInferencePrompt(request);
  logger.debug(`Prompt generated (${prompt.length} characters)`);

  logger.debug('Calling Claude Code for inference...');
  const response = await claudeClient.runInference(prompt);
  logger.debug(`Received response from Claude Code (${response.length} characters)`);

  // Parse the JSON response from Claude
  try {
    logger.debug('Parsing inference response...');
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```json\s*(.*?)\s*```/s);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonStr);
    logger.debug('JSON parsed successfully, validating with schema...');
    const validated = InferenceResponseSchema.parse(parsed);
    logger.debug('Schema validation successful');
    return validated;
  } catch (error) {
    logger.error('Failed to parse inference response:', error);
    logger.error('Raw response:', response);
    throw new Error(
      `Failed to parse inference response: ${error instanceof Error ? error.message : 'Unknown error'}\n\nRaw response: ${response}`
    );
  }
}

/**
 * Simple file-based secrets provider
 */
export class FileSecretsProvider implements ISecretsProvider {
  constructor(private secretsPath?: string) {}

  async getSecret(key: string): Promise<string | undefined> {
    if (!this.secretsPath) return undefined;

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(this.secretsPath, 'utf-8');
      const secrets = JSON.parse(content);
      return secrets[key];
    } catch {
      return undefined;
    }
  }

  async listAvailableSecrets(): Promise<string[]> {
    if (!this.secretsPath) return [];

    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(this.secretsPath, 'utf-8');
      const secrets = JSON.parse(content);
      return Object.keys(secrets);
    } catch {
      return [];
    }
  }
}
