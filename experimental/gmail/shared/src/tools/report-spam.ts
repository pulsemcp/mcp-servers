import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import {
  requestConfirmation,
  createConfirmationSchema,
  readElicitationConfig,
} from '@pulsemcp/mcp-elicitation';

const PARAM_DESCRIPTIONS = {
  email_id:
    'The unique identifier of the email to report as spam. ' +
    'Obtain this from list_email_conversations, get_email_conversation, or search_email_conversations.',
} as const;

export const ReportSpamSchema = z.object({
  email_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.email_id),
});

const TOOL_DESCRIPTION = `Report an email as spam. This moves the email to the Spam folder by adding the SPAM label and removing it from INBOX.

**Parameters:**
- email_id: The unique identifier of the email to report as spam (required)

**Behavior:**
- Adds the SPAM label to the email
- Removes the INBOX label (if present)
- The email will appear in Gmail's Spam folder

**Use cases:**
- Report unwanted or unsolicited emails as spam
- Move phishing or suspicious emails out of the inbox

**Warning:** This action reports the email as spam to Gmail. Get the email_id from list_email_conversations or search_email_conversations first.`;

export function reportSpamTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'report_spam',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        email_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.email_id,
        },
      },
      required: ['email_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ReportSpamSchema.parse(args ?? {});
        const client = clientFactory();

        const elicitationConfig = readElicitationConfig();
        if (elicitationConfig.enabled) {
          const confirmMessage =
            `About to report email (ID: ${parsed.email_id}) as spam.\n\n` +
            `This will move the email to the Spam folder.`;

          const confirmation = await requestConfirmation(
            {
              server,
              message: confirmMessage,
              requestedSchema: createConfirmationSchema(
                'Report this email as spam?',
                'Confirm that you want to report this email as spam and move it out of your inbox.'
              ),
              meta: {
                'com.pulsemcp/tool-name': 'report_spam',
              },
            },
            elicitationConfig
          );

          if (confirmation.action !== 'accept') {
            if (confirmation.action === 'expired') {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Spam report confirmation expired. Please try again.',
                  },
                ],
                isError: true,
              };
            }
            return {
              content: [
                {
                  type: 'text',
                  text: 'Spam report was cancelled by the user.',
                },
              ],
            };
          }

          if (
            confirmation.content &&
            'confirm' in confirmation.content &&
            confirmation.content.confirm === false
          ) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Spam report was not confirmed. The email was not moved to spam.',
                },
              ],
            };
          }
        }

        const updatedEmail = await client.modifyMessage(parsed.email_id, {
          addLabelIds: ['SPAM'],
          removeLabelIds: ['INBOX'],
        });

        return {
          content: [
            {
              type: 'text',
              text:
                `Email ${parsed.email_id} reported as spam successfully.\n\n` +
                `The email has been moved to the Spam folder.\n` +
                `Current labels: ${updatedEmail.labelIds?.join(', ') || 'None'}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error reporting email as spam: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
