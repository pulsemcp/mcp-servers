import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { ClientFactory } from '../server.js';

export function getMetadata(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_proctor_metadata',
    description: `Get available runtimes and exams for Proctor testing.

Returns the list of available runtime environments (Docker images) and exam types.

**Returns:**
- runtimes: Array of runtime configurations with id, name, and Docker image
- exams: Array of exam types with id, name, and description

**Use cases:**
- Discover available runtime environments
- Find the correct exam ID for a specific test type
- Check which runtime versions are available`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => {
      const client = clientFactory();

      try {
        const response = await client.getMetadata();

        let content = '## Available Proctor Runtimes\n\n';

        for (const runtime of response.runtimes) {
          content += `- **${runtime.name}** (id: \`${runtime.id}\`)\n`;
          content += `  Image: \`${runtime.image}\`\n`;
        }

        content += '\n## Available Exams\n\n';

        for (const exam of response.exams) {
          content += `- **${exam.name}** (id: \`${exam.id}\`)\n`;
          if (exam.description) {
            content += `  ${exam.description}\n`;
          }
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
              text: `Error getting Proctor metadata: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
