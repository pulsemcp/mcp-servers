/**
 * Example usage of the LLM server configuration generation infrastructure
 * This file demonstrates how to use the new LLM components
 */

import { ServerConfigGeneratorFactory, type ServerConfigInput } from './index.js';

// Example usage of the LLM infrastructure
export async function exampleUsage() {
  // Create a generator from environment variables
  const generator = ServerConfigGeneratorFactory.createFromEnv();

  if (!generator) {
    console.log('No LLM configuration found in environment variables');
    console.log('Set LLM_PROVIDER (anthropic|openai) and LLM_API_KEY to use LLM generation');
    return;
  }

  // Example server.json configuration to convert
  const exampleServerConfig = {
    $schema: 'https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json',
    name: 'com.example/test-server',
    description: 'Example test server for demonstration',
    version: '1.0.0',
    packages: [
      {
        registryType: 'npm',
        identifier: '@example/test-mcp-server',
        version: '1.0.0',
        runtimeHint: 'npx',
        transport: {
          type: 'stdio',
        },
        runtimeArguments: [
          {
            type: 'positional',
            value: '-y',
          },
        ],
        environmentVariables: [
          {
            name: 'API_KEY',
            description: 'API key for the test service',
            isRequired: true,
          },
          {
            name: 'BASE_URL',
            description: 'Base URL for the API',
            default: 'https://api.example.com',
            isRequired: false,
          },
        ],
      },
    ],
  };

  const input: ServerConfigInput = {
    serverConfig: exampleServerConfig,
    userPreferences: {
      serverName: 'test-server',
      includeEnvironmentVariables: true,
    },
  };

  try {
    console.log('Generating .mcp.json configuration...');
    const result = await generator.generateServerConfig(input);

    if (result.success) {
      console.log('Generated configuration:');
      console.log(JSON.stringify(result.mcpConfig, null, 2));
      console.log('\nExplanation:');
      console.log(result.explanation);
    } else {
      console.error('Generation failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if module is being run directly (for testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  exampleUsage().catch(console.error);
}
