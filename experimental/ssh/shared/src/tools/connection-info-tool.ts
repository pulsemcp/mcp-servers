import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

export const ConnectionInfoToolSchema = z.object({});

export function connectionInfoTool(_server: Server, _clientFactory: ClientFactory) {
  return {
    name: 'ssh_connection_info',
    description: `Get information about the configured SSH connection.

**Returns:** JSON object with host, port, username, and authentication method details

**Use cases:**
- Verify SSH connection configuration
- Debug connection issues
- Confirm which server is being targeted`,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (_args: unknown) => {
      try {
        const info = {
          host: process.env.SSH_HOST || 'not configured',
          port: process.env.SSH_PORT || '22',
          username: process.env.SSH_USERNAME || 'not configured',
          authentication: {
            sshAgent: process.env.SSH_AUTH_SOCK ? 'available' : 'not available',
            privateKey: process.env.SSH_PRIVATE_KEY_PATH ? 'configured' : 'not configured',
          },
          timeout: process.env.SSH_TIMEOUT || '30000',
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(info, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting connection info: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
