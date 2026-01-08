import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  localPath:
    'Absolute path to the local file to upload. Example: "/Users/me/documents/config.json"',
  remotePath: 'Destination path on the remote server. Example: "/home/user/config.json"',
} as const;

export const UploadToolSchema = z.object({
  localPath: z.string().describe(PARAM_DESCRIPTIONS.localPath),
  remotePath: z.string().describe(PARAM_DESCRIPTIONS.remotePath),
});

export function uploadTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'ssh_upload',
    description: `Upload a file from the local machine to the remote SSH server via SFTP.

**Returns:** Success message with transfer details

**Use cases:**
- Deploy configuration files to servers
- Upload scripts for remote execution
- Transfer data files for processing`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        localPath: { type: 'string', description: PARAM_DESCRIPTIONS.localPath },
        remotePath: { type: 'string', description: PARAM_DESCRIPTIONS.remotePath },
      },
      required: ['localPath', 'remotePath'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UploadToolSchema.parse(args);
        const client = clientFactory();

        await client.upload(validatedArgs.localPath, validatedArgs.remotePath);

        // Disconnect after upload
        client.disconnect();

        return {
          content: [
            {
              type: 'text',
              text: `Successfully uploaded ${validatedArgs.localPath} to ${validatedArgs.remotePath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error uploading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
