import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  path: 'Path to the directory on the remote server. Example: "/var/log" or "/home/user"',
} as const;

export const ListDirectoryToolSchema = z.object({
  path: z.string().describe(PARAM_DESCRIPTIONS.path),
});

export function listDirectoryTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'ssh_list_directory',
    description: `List the contents of a directory on the remote SSH server via SFTP.

**Returns:** JSON array of directory entries with filename, type, size, permissions, and modification time

**Use cases:**
- Browse remote file systems
- Check for specific files or directories
- Verify deployments and file presence`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: { type: 'string', description: PARAM_DESCRIPTIONS.path },
      },
      required: ['path'],
    },
    handler: async (args: unknown) => {
      const client = clientFactory();
      try {
        const validatedArgs = ListDirectoryToolSchema.parse(args);

        const entries = await client.listDirectory(validatedArgs.path);

        // Format entries for display
        const formattedEntries = entries.map((entry) => ({
          name: entry.filename,
          type: entry.isDirectory ? 'directory' : 'file',
          size: entry.size,
          permissions: entry.permissions,
          modified: entry.modifyTime.toISOString(),
        }));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formattedEntries, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing directory: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      } finally {
        client.disconnect();
      }
    },
  };
}
