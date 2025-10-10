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

The .mcp.json format is used by Claude Code for MCP configuration and follows this structure:
{
  "mcpServers": {
    "server-name": {
      "command": "command-to-run",
      "args": ["arg1", "arg2"],
      "env": {
        "ENV_VAR": "value"
      }
    }
  }
}

Key conversion rules:
1. Extract the server name from the input (either from userPreferences.serverName or derive from the server.json name field)
2. Convert the package information to command/args format:
   - For npm packages: use "npx" as command and the package identifier as first arg
   - Include any runtimeArguments as additional args
   - Handle positional and named arguments appropriately
3. Convert environmentVariables to env object with appropriate defaults
4. Ensure the output is valid JSON that can be used directly in Claude Code

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
