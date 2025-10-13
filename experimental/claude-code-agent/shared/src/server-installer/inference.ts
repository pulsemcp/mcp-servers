import {
  InferenceRequest,
  InferenceResponse,
  InferenceResponseSchema,
  IClaudeCodeInferenceClient,
  ISecretsProvider,
  ServerConfig,
} from './types.js';
import { DEFAULT_CONFIG } from './config.js';

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
   - Use available secrets for sensitive values
   - Set reasonable defaults for non-sensitive configuration
   - Leave sensitive variables unset if no secret is available

## Response Format
Return a JSON object matching this exact structure:

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
        "API_KEY": "secret_api_key_value_or_placeholder",
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
- Use secrets when available, otherwise provide placeholder values and add warnings
- Set reasonable defaults for timeouts, URLs, and other configuration
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
  const prompt = generateInferencePrompt(request);

  const response = await claudeClient.runInference(prompt);

  // Parse the JSON response from Claude
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = response.match(/```json\s*(.*?)\s*```/s);
    const jsonStr = jsonMatch ? jsonMatch[1] : response;

    const parsed = JSON.parse(jsonStr);
    return InferenceResponseSchema.parse(parsed);
  } catch (error) {
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
