import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  command: 'The shell command to execute on the remote server. Example: "ls -la /var/log"',
  cwd: 'Working directory on the remote server. The command will be executed from this directory. Example: "/home/user/project"',
  timeout:
    'Activity timeout in milliseconds. The timeout resets whenever stdout or stderr output is received, allowing long-running commands that produce periodic output to complete. Commands with no output for this duration will be terminated. Default: 60000 (1 minute), or SSH_COMMAND_TIMEOUT if configured.',
} as const;

export const ExecuteToolSchema = z.object({
  command: z.string().describe(PARAM_DESCRIPTIONS.command),
  cwd: z.string().optional().describe(PARAM_DESCRIPTIONS.cwd),
  timeout: z.number().optional().describe(PARAM_DESCRIPTIONS.timeout),
});

export function executeTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'ssh_execute',
    description: `Execute a command on the remote SSH server.

**Returns:** JSON object with stdout, stderr, and exit code

**Use cases:**
- Run shell commands on remote servers
- Check system status (uptime, disk space, processes)
- Execute scripts or programs remotely
- Manage services and applications`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        command: { type: 'string', description: PARAM_DESCRIPTIONS.command },
        cwd: { type: 'string', description: PARAM_DESCRIPTIONS.cwd },
        timeout: { type: 'number', description: PARAM_DESCRIPTIONS.timeout },
      },
      required: ['command'],
    },
    handler: async (args: unknown) => {
      const client = clientFactory();
      try {
        const validatedArgs = ExecuteToolSchema.parse(args);

        const result = await client.execute(validatedArgs.command, {
          cwd: validatedArgs.cwd,
          timeout: validatedArgs.timeout,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  exitCode: result.exitCode,
                  stdout: result.stdout,
                  stderr: result.stderr,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
