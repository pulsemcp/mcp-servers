import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

const PARAM_DESCRIPTIONS = {
  session_id: 'Session ID (numeric) to send the push notification for.',
  message:
    'The notification message to send. Should describe why human attention is needed (e.g., "Needs API key for Proctor MCP server to proceed").',
} as const;

export const SendPushNotificationSchema = z.object({
  session_id: z.union([z.string(), z.number()]).describe(PARAM_DESCRIPTIONS.session_id),
  message: z.string().describe(PARAM_DESCRIPTIONS.message),
});

const TOOL_DESCRIPTION = `Send a push notification to the user about a session that needs attention.

**Use this tool when:**
- A session genuinely requires human intervention (e.g., missing credentials, approval needed)
- You want to alert the user about an important session status change

**Parameters:**
- **session_id**: The numeric ID of the session the notification relates to
- **message**: A clear, actionable message describing what the user needs to do

**Note:** Use this sparingly - only for situations that truly require human attention.`;

export function sendPushNotificationTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'send_push_notification',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description: PARAM_DESCRIPTIONS.session_id,
        },
        message: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.message,
        },
      },
      required: ['session_id', 'message'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = SendPushNotificationSchema.parse(args);
        const client = clientFactory();
        const { session_id, message } = validatedArgs;

        const response = await client.sendPushNotification(session_id, message);

        const lines = [
          `## Push Notification Sent`,
          '',
          `- **Session ID:** ${response.session_id}`,
          `- **Message:** ${response.message}`,
        ];

        return {
          content: [{ type: 'text', text: lines.join('\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending push notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
