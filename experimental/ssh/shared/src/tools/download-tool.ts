import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  remotePath: 'Path to the file on the remote server. Example: "/var/log/app.log"',
  localPath: 'Destination path on the local machine. Example: "/Users/me/downloads/app.log"',
} as const;

export const DownloadToolSchema = z.object({
  remotePath: z.string().describe(PARAM_DESCRIPTIONS.remotePath),
  localPath: z.string().describe(PARAM_DESCRIPTIONS.localPath),
});

export function downloadTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'ssh_download',
    description: `Download a file from the remote SSH server to the local machine via SFTP.

**Returns:** Success message with transfer details

**Use cases:**
- Retrieve log files for analysis
- Download backups or exports
- Fetch configuration files for review`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        remotePath: { type: 'string', description: PARAM_DESCRIPTIONS.remotePath },
        localPath: { type: 'string', description: PARAM_DESCRIPTIONS.localPath },
      },
      required: ['remotePath', 'localPath'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DownloadToolSchema.parse(args);
        const client = clientFactory();

        await client.download(validatedArgs.remotePath, validatedArgs.localPath);

        // Disconnect after download
        client.disconnect();

        return {
          content: [
            {
              type: 'text',
              text: `Successfully downloaded ${validatedArgs.remotePath} to ${validatedArgs.localPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error downloading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
