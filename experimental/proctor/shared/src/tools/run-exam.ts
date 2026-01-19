import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  runtime_id:
    'Runtime ID from get_proctor_metadata, or "__custom__" for a custom Docker image. Example: "v0.0.37"',
  exam_id:
    'Exam ID from get_proctor_metadata. Example: "proctor-mcp-client-init-tools-list" or "proctor-mcp-client-auth-check"',
  mcp_json: `JSON string of the mcp.json configuration for the MCP server to test.

**Simple examples:**

HTTP server:
\`\`\`json
{
  "my-server": {
    "type": "streamable-http",
    "url": "https://example.com/mcp"
  }
}
\`\`\`

stdio server:
\`\`\`json
{
  "my-server": {
    "command": "npx",
    "args": ["-y", "my-mcp-server"]
  }
}
\`\`\`

**Standard fields per server entry:**
- type: Transport type ("streamable-http", "sse", "stdio")
- url: Server URL (for HTTP transports)
- headers: HTTP headers as { "Header-Name": "value" } (optional)
- env: Environment variables as { "VAR_NAME": "value" } (optional)
- command: Command for stdio transport (e.g., "npx", "uvx")
- args: Arguments for stdio command as ["arg1", "arg2"]

**Advanced/internal fields (underscore-prefixed, added inside a server entry):**
- _proctor_files: Object mapping filenames to content. Files are created in the working directory before exam execution.
- _proctor_pre_registered_client: Pre-registered OAuth client for providers that don't support Dynamic Client Registration (DCR).

Example with advanced fields:
\`\`\`json
{
  "my-server": {
    "type": "streamable-http",
    "url": "https://example.com/mcp",
    "_proctor_files": {
      "config.json": "{\\"apiKey\\": \\"test\\"}"
    },
    "_proctor_pre_registered_client": {
      "client_id": "abc123",
      "client_secret": "secret",
      "redirect_uri": "https://pulsemcp.com/oauth/callback"
    }
  }
}
\`\`\`

These underscore-prefixed fields are stripped from the config before execution and are used only for exam setup.`,
  server_json: `Optional JSON string of server.json for result enrichment. Provides additional context about the server being tested.

**Simple example:**
\`\`\`json
{
  "name": "my-mcp-server",
  "title": "My MCP Server",
  "description": "A helpful MCP server",
  "remotes": [
    { "url": "https://example.com/mcp", "type": "streamable-http" }
  ]
}
\`\`\`

The server.json follows the server.json specification and can include: name, title, description, version, websiteUrl, remotes (with url, type, headers), and packages (for stdio servers with identifier, registryType, runtimeHint, environmentVariables, runtimeArguments).`,
  custom_runtime_image:
    'Required if runtime_id is "__custom__". Docker image URL in format: registry/image:tag',
  max_retries: 'Maximum number of retry attempts (0-10). Default is 0.',
} as const;

const RunExamSchema = z.object({
  runtime_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.runtime_id),
  exam_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.exam_id),
  mcp_json: z.string().min(1).describe(PARAM_DESCRIPTIONS.mcp_json),
  server_json: z.string().optional().describe(PARAM_DESCRIPTIONS.server_json),
  custom_runtime_image: z.string().optional().describe(PARAM_DESCRIPTIONS.custom_runtime_image),
  max_retries: z.number().min(0).max(10).optional().describe(PARAM_DESCRIPTIONS.max_retries),
});

export function runExam(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'run_exam',
    description: `Execute a Proctor exam against an MCP server.

Runs the specified exam using the provided runtime and MCP configuration. The exam
tests the MCP server's functionality and returns detailed results.

**Returns:**
- Streaming logs showing exam progress
- Final result with status and detailed test outcomes

**Use cases:**
- Test an MCP server's initialization and tool listing
- Verify authentication mechanisms work correctly
- Run comprehensive functionality tests
- Validate MCP protocol compliance
- Test before publishing a new MCP server version

**mcp_json Format:**
The mcp_json parameter accepts a JSON object with server configurations. Each server entry can include:
- Standard fields: type, url, headers, env, command, args
- Advanced fields (underscore-prefixed, stripped before execution):
  - _proctor_files: Files to create in working directory (map of filename to content)
  - _proctor_pre_registered_client: Pre-registered OAuth client credentials for non-DCR providers

**Note:**
- Use get_proctor_metadata first to discover available runtimes and exams
- The mcp_json must be a valid JSON string representing the mcp.json format
- Custom runtime images require the "__custom__" runtime_id and custom_runtime_image parameter
- Underscore-prefixed fields in mcp_json are used for exam setup only and stripped before server execution`,
    inputSchema: {
      type: 'object',
      properties: {
        runtime_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.runtime_id,
        },
        exam_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.exam_id,
        },
        mcp_json: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.mcp_json,
        },
        server_json: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.server_json,
        },
        custom_runtime_image: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.custom_runtime_image,
        },
        max_retries: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.max_retries,
        },
      },
      required: ['runtime_id', 'exam_id', 'mcp_json'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = RunExamSchema.parse(args);

      // Validate mcp_json is valid JSON
      try {
        JSON.parse(validatedArgs.mcp_json);
      } catch {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: mcp_json must be a valid JSON string',
            },
          ],
          isError: true,
        };
      }

      // Validate custom runtime requirements
      if (validatedArgs.runtime_id === '__custom__' && !validatedArgs.custom_runtime_image) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: custom_runtime_image is required when runtime_id is "__custom__"',
            },
          ],
          isError: true,
        };
      }

      const client = clientFactory();

      try {
        const logs: string[] = [];
        let finalResult: Record<string, unknown> | null = null;
        let errorMessage: string | null = null;

        // Consume the streaming response
        for await (const entry of client.runExam({
          runtime_id: validatedArgs.runtime_id,
          exam_id: validatedArgs.exam_id,
          mcp_json: validatedArgs.mcp_json,
          server_json: validatedArgs.server_json,
          custom_runtime_image: validatedArgs.custom_runtime_image,
          max_retries: validatedArgs.max_retries,
        })) {
          if (entry.type === 'log') {
            const logData = entry.data;
            if (logData.message) {
              logs.push(`[${logData.time || 'LOG'}] ${logData.message}`);
            } else {
              logs.push(`[LOG] ${JSON.stringify(logData)}`);
            }
          } else if (entry.type === 'result') {
            finalResult = entry.data;
          } else if (entry.type === 'error') {
            errorMessage = entry.data.error;
          }
        }

        // Build the response
        let content = '## Exam Execution\n\n';
        content += `**Runtime:** ${validatedArgs.runtime_id}\n`;
        content += `**Exam:** ${validatedArgs.exam_id}\n\n`;

        if (logs.length > 0) {
          content += '### Logs\n\n```\n';
          content += logs.join('\n');
          content += '\n```\n\n';
        }

        if (errorMessage) {
          content += `### Error\n\n${errorMessage}\n`;
          return {
            content: [{ type: 'text', text: content.trim() }],
            isError: true,
          };
        }

        if (finalResult) {
          content += '### Result\n\n```json\n';
          content += JSON.stringify(finalResult, null, 2);
          content += '\n```\n';
        }

        return {
          content: [
            {
              type: 'text',
              text: content.trim(),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error running exam: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
