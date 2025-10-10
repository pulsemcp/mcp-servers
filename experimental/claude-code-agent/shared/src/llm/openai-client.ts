import OpenAI from 'openai';
import type {
  IServerConfigGenerator,
  ServerConfigGenerationOptions,
  ServerConfigGenerationResult,
  ServerConfigInput,
  LLMConfig,
} from './types.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const MAX_TOKENS = 4096; // OpenAI models support max 4096 completion tokens

export class OpenAIServerConfigGenerator implements IServerConfigGenerator {
  private client: OpenAI;
  private model: string;

  constructor(config: LLMConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey: config.apiKey,
    });

    this.model = config.model || DEFAULT_MODEL;
  }

  async generateServerConfig(
    input: ServerConfigInput,
    _options?: ServerConfigGenerationOptions
  ): Promise<ServerConfigGenerationResult> {
    try {
      const systemPrompt = `You are an expert at converting MCP server configurations from server.json format to .mcp.json format used by Claude Code.

The server.json format contains metadata about MCP servers including packages with registry information, runtime arguments, and environment variables.

The .mcp.json format is used by Claude Code for MCP configuration. Here are comprehensive examples:

## Transport Types

### stdio Servers (External processes via stdin/stdout)
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem"],
      "env": {
        "ALLOWED_PATHS": "/Users/me/projects"
      }
    },
    "python-tool": {
      "command": "python",
      "args": ["-m", "mcp_server_filesystem"],
      "env": {
        "ALLOWED_PATHS": "/Users/me/projects"
      }
    },
    "node-server": {
      "command": "node",
      "args": ["./my-mcp-server.js"],
      "env": {
        "DEBUG": "\${DEBUG:-false}"
      }
    }
  }
}

### HTTP/SSE Servers (Remote servers with network communication)
{
  "mcpServers": {
    "remote-sse": {
      "type": "sse",
      "url": "https://api.example.com/mcp/sse",
      "headers": {
        "Authorization": "Bearer \${API_TOKEN}",
        "X-API-Key": "\${API_KEY}"
      }
    },
    "http-service": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "X-API-Key": "\${API_KEY}"
      }
    }
  }
}

### Environment Variable Patterns
{
  "mcpServers": {
    "secure-api": {
      "type": "sse",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer \${API_TOKEN}",
        "X-API-Key": "\${API_KEY:-default-key}"
      }
    },
    "database": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-database"],
      "env": {
        "DATABASE_URL": "\${DATABASE_URL}",
        "DB_HOST": "\${DB_HOST:-localhost}",
        "DB_PORT": "\${DB_PORT:-5432}"
      }
    }
  }
}

## Key conversion rules:
1. Extract the server name from the input (either from userPreferences.serverName or derive from the server.json name field)
2. Convert the package information to appropriate transport type:
   - For npm packages: use "npx" as command and the package identifier as first arg
   - For python packages: use "python" with "-m" flag and module name
   - For HTTP/SSE: use "type" field with "url" and optional "headers"
   - Include any runtimeArguments as additional args
   - Handle positional and named arguments appropriately
3. Convert environmentVariables to env object with appropriate defaults using \${VAR:-default} syntax
4. For remote servers, prefer "sse" type over "http" when possible
5. Always use environment variable substitution for sensitive values like API keys
6. Ensure the output is valid JSON that can be used directly in Claude Code

Be precise and follow the exact format. Only output valid JSON for the .mcp.json configuration.`;

      const userPrompt = `Convert this server configuration to .mcp.json format:

Server Configuration:
${JSON.stringify(input.serverConfig, null, 2)}

User Preferences:
${JSON.stringify(input.userPreferences || {}, null, 2)}

Please generate the .mcp.json configuration and provide a brief explanation of the conversion.

Respond in this format:
<config>
{valid .mcp.json content here}
</config>

<explanation>
Brief explanation of the conversion here
</explanation>`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const responseText = response.choices[0]?.message?.content;

      if (!responseText) {
        return {
          success: false,
          error: 'No content generated from OpenAI response',
        };
      }

      // Parse the config and explanation from the response
      const configMatch = responseText.match(/<config>([\s\S]*?)<\/config>/);
      const explanationMatch = responseText.match(/<explanation>([\s\S]*?)<\/explanation>/);

      if (!configMatch) {
        return {
          success: false,
          error: 'Could not extract configuration from response',
        };
      }

      let mcpConfig: Record<string, unknown>;
      try {
        mcpConfig = JSON.parse(configMatch[1].trim());
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse generated configuration: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        };
      }

      return {
        success: true,
        mcpConfig,
        explanation: explanationMatch
          ? explanationMatch[1].trim()
          : 'Configuration generated successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: `OpenAI server config generation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}
