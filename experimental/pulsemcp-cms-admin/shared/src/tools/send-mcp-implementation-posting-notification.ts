import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

// Default email content template
const DEFAULT_EMAIL_CONTENT = `Hi there,

Your submission is now live here: \${implementationUrl}

Let us know how we can be helpful to you!

Best,
Tadas`;

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  implementation_id: 'The ID of the MCP implementation to send notification for (e.g., 11371)',
  to_email_address:
    'Override the recipient email address. If not provided, uses email from implementation internal notes',
  from_email_address: 'Sender email address. Default: "tadas@s.pulsemcp.com"',
  from_name: 'Sender display name. Default: "Tadas at PulseMCP"',
  reply_to_email_address: 'Reply-to email address. Default: "tadas@pulsemcp.com"',
  content: `Custom email body content. Use \${implementationUrl} to insert the link to the live implementation. Default:

${DEFAULT_EMAIL_CONTENT}`,
} as const;

const SendMCPImplementationPostingNotificationSchema = z.object({
  implementation_id: z.number().describe(PARAM_DESCRIPTIONS.implementation_id),
  to_email_address: z.string().email().optional().describe(PARAM_DESCRIPTIONS.to_email_address),
  from_email_address: z.string().email().optional().describe(PARAM_DESCRIPTIONS.from_email_address),
  from_name: z.string().optional().describe(PARAM_DESCRIPTIONS.from_name),
  reply_to_email_address: z
    .string()
    .email()
    .optional()
    .describe(PARAM_DESCRIPTIONS.reply_to_email_address),
  content: z.string().optional().describe(PARAM_DESCRIPTIONS.content),
});

export function sendMCPImplementationPostingNotification(
  _server: Server,
  clientFactory: ClientFactory
) {
  return {
    name: 'send_mcp_implementation_posting_notification',
    description: `Send an email notification to the submitter of an MCP implementation that has been published to PulseMCP.

This tool sends the actual notification email (not just a draft) to inform submitters that their MCP implementation is now live on PulseMCP. It replicates and extends the "Draft Notification" functionality from the Admin panel, but actually sends the email.

**Important**: This tool SENDS the email immediately. It does not create a draft.

The email is sent to:
1. The email address specified in the to_email_address parameter (if provided)
2. OR the email extracted from the implementation's internal notes (if no override provided)

The implementation must:
- Have a status of "live"
- Have either an associated MCP server or client with a valid slug

Example usage:
{
  "implementation_id": 11371,
  "to_email_address": "developer@example.com"  // Optional override
}

**Customizing email content:**
Use the \`content\` parameter to customize the email body. Include \`\${implementationUrl}\` where you want the link to the live implementation inserted.

Default content:
\`\`\`
Hi there,

Your submission is now live here: \${implementationUrl}

Let us know how we can be helpful to you!

Best,
Tadas
\`\`\`

Example with custom content:
{
  "implementation_id": 11371,
  "content": "Hey Mike,\\n\\nYour submission is now live here: \${implementationUrl}\\n\\nLet us know how we can be helpful to you!\\n\\nBest,\\nTadas"
}

Default email template:
- Subject: "Thanks for your submission to PulseMCP!"
- From: "Tadas at PulseMCP" <tadas@s.pulsemcp.com>
- Reply-to: tadas@pulsemcp.com

Use cases:
- Notify submitters when their implementation goes live
- Send thank you emails after publishing implementations
- Automate the notification process after approving submissions
- Re-send notifications if needed
- Send customized messages for different implementation types`,
    inputSchema: {
      type: 'object',
      properties: {
        implementation_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.implementation_id,
        },
        to_email_address: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.to_email_address,
        },
        from_email_address: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.from_email_address,
        },
        from_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.from_name,
        },
        reply_to_email_address: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.reply_to_email_address,
        },
        content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content,
        },
      },
      required: ['implementation_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SendMCPImplementationPostingNotificationSchema.parse(args);
      const client = clientFactory();

      try {
        // First, fetch the implementation details by ID
        const implementation = await client.getMCPImplementationById(
          validatedArgs.implementation_id
        );

        if (!implementation) {
          throw new Error(
            `MCP implementation with ID ${validatedArgs.implementation_id} not found`
          );
        }

        // Validate the implementation is eligible for notification
        if (implementation.status !== 'live') {
          throw new Error(
            `Cannot send notification for implementation with status "${implementation.status}". Implementation must be live.`
          );
        }

        // Get URL from embedded server or client data
        let implementationUrl = '';

        // The implementation response includes embedded mcp_server or mcp_client objects
        if (implementation.mcp_server?.slug) {
          implementationUrl = `https://www.pulsemcp.com/servers/${implementation.mcp_server.slug}`;
        } else if (implementation.mcp_client?.slug) {
          implementationUrl = `https://www.pulsemcp.com/clients/${implementation.mcp_client.slug}`;
        }

        if (!implementationUrl) {
          throw new Error(
            'Cannot send notification: Implementation has no associated MCP server or client with a valid slug'
          );
        }

        // Determine recipient email
        let recipientEmail = validatedArgs.to_email_address;

        if (!recipientEmail) {
          // Extract email from internal notes if not provided
          // Pattern: email addresses in internal notes (e.g., "developer@example.com requested updates")
          const emailMatch = implementation.internal_notes?.match(
            /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/
          );
          if (emailMatch) {
            recipientEmail = emailMatch[0];
          }
        }

        if (!recipientEmail) {
          throw new Error(
            'No recipient email address found. Please provide to_email_address parameter or ensure the implementation has an email in its internal notes.'
          );
        }

        // Prepare email content - use custom content or default, replacing ${implementationUrl}
        // Using function callback to avoid special character issues in replacement
        const contentTemplate = validatedArgs.content || DEFAULT_EMAIL_CONTENT;
        const emailContent = contentTemplate.replace(
          /\$\{implementationUrl\}/g,
          () => implementationUrl
        );

        // Prepare email parameters with defaults
        const emailParams = {
          from_email_address: validatedArgs.from_email_address || 'tadas@s.pulsemcp.com',
          from_name: validatedArgs.from_name || 'Tadas at PulseMCP',
          reply_to_email_address: validatedArgs.reply_to_email_address || 'tadas@pulsemcp.com',
          to_email_address: recipientEmail,
          subject: 'Thanks for your submission to PulseMCP!',
          content: emailContent,
        };

        // Send the email via the API
        const emailResult = await client.sendEmail(emailParams);

        // Format the response
        let content = `✅ Successfully sent notification email!\n\n`;
        content += `**Implementation Details:**\n`;
        content += `- Name: ${implementation.name}\n`;
        content += `- ID: ${implementation.id}\n`;
        content += `- Type: ${implementation.type}\n`;
        content += `- Status: ${implementation.status}\n`;
        content += `- Live URL: ${implementationUrl}\n\n`;

        content += `**Email Details:**\n`;
        content += `- To: ${recipientEmail}\n`;
        content += `- From: ${emailParams.from_name} <${emailParams.from_email_address}>\n`;
        content += `- Reply-to: ${emailParams.reply_to_email_address}\n`;
        content += `- Subject: ${emailParams.subject}\n\n`;

        if (emailResult.id) {
          content += `**Email Record:**\n`;
          content += `- Email ID: ${emailResult.id}\n`;
          if (emailResult.campaign_identifier) {
            content += `- Campaign ID: ${emailResult.campaign_identifier}\n`;
          }
          if (emailResult.send_timestamp_utc) {
            content += `- Sent at: ${new Date(emailResult.send_timestamp_utc).toISOString()}\n`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending MCP implementation notification: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
