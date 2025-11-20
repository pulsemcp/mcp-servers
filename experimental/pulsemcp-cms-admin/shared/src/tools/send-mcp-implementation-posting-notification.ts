import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const SendMCPImplementationPostingNotificationSchema = z.object({
  implementation_id: z
    .number()
    .describe(
      'The ID of the MCP implementation to send a notification about. Use search_mcp_implementations or get_draft_mcp_implementations to find implementation IDs.'
    ),
  recipient_email: z
    .string()
    .email()
    .describe(
      'Email address of the recipient (typically the person who submitted the implementation)'
    ),
  from_email: z
    .string()
    .email()
    .optional()
    .describe('Sender email address. Defaults to tadas@pulsemcp.com'),
  from_name: z.string().optional().describe('Sender name. Defaults to "Tadas"'),
  reply_to_email: z
    .string()
    .email()
    .optional()
    .describe('Reply-to email address. Defaults to tadas@pulsemcp.com'),
});

export function sendMCPImplementationPostingNotification(
  _server: Server,
  clientFactory: ClientFactory
) {
  return {
    name: 'send_mcp_implementation_posting_notification',
    description: `Send an email notification to the submitter of an MCP implementation informing them that their submission is now live on PulseMCP.com.

This tool composes and sends a personalized email with:
- A thank you message for the submission
- A direct link to their live implementation page on PulseMCP.com
- An offer to help with any questions or needs
- Professional signature from the PulseMCP team

The email follows the pattern established in the web-app codebase for notifying users about their posted implementations.

Example workflow:
1. Use search_mcp_implementations or get_draft_mcp_implementations to find an implementation
2. Use this tool to send a notification email to the submitter
3. The email will be sent via SendGrid with proper tracking

Example successful response:
{
  "email_id": 123,
  "sent_to": "user@example.com",
  "subject": "Thanks for your submission to PulseMCP!",
  "sent_at": "2025-11-20T17:30:00Z"
}

Use cases:
- Notify submitters when their MCP server/client goes live
- Send personalized thank you emails with implementation links
- Maintain engagement with community contributors
- Track notification history via campaign identifiers`,
    inputSchema: {
      type: 'object',
      properties: {
        implementation_id: {
          type: 'number',
          description:
            'The ID of the MCP implementation to send a notification about. Use search_mcp_implementations or get_draft_mcp_implementations to find implementation IDs.',
        },
        recipient_email: {
          type: 'string',
          description:
            'Email address of the recipient (typically the person who submitted the implementation)',
        },
        from_email: {
          type: 'string',
          description: 'Sender email address. Defaults to tadas@pulsemcp.com',
        },
        from_name: {
          type: 'string',
          description: 'Sender name. Defaults to "Tadas"',
        },
        reply_to_email: {
          type: 'string',
          description: 'Reply-to email address. Defaults to tadas@pulsemcp.com',
        },
      },
      required: ['implementation_id', 'recipient_email'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SendMCPImplementationPostingNotificationSchema.parse(args);
      const client = clientFactory();

      try {
        // Get the implementation details by searching for the ID
        const searchResults = await client.searchMCPImplementations({
          query: `id:${validatedArgs.implementation_id}`,
          type: 'all',
          status: 'all',
          limit: 1,
        });

        if (!searchResults.implementations || searchResults.implementations.length === 0) {
          throw new Error(`Implementation with ID ${validatedArgs.implementation_id} not found`);
        }

        const implementation = searchResults.implementations[0];

        // Determine the URL based on type
        let implementationUrl: string;
        if (implementation.type === 'server' && implementation.slug) {
          implementationUrl = `https://www.pulsemcp.com/servers/${implementation.slug}`;
        } else if (implementation.type === 'client' && implementation.slug) {
          implementationUrl = `https://www.pulsemcp.com/clients/${implementation.slug}`;
        } else {
          throw new Error(`Cannot determine URL for implementation: missing slug or invalid type`);
        }

        // Compose the email content (matching the web-app pattern)
        const subject = 'Thanks for your submission to PulseMCP!';
        const content = `Hi there,

Your submission is now live here: ${implementationUrl}

Let us know how we can be helpful to you!

Best,
Tadas`;

        // Send the email
        const emailResult = await client.sendEmail({
          from_email_address: validatedArgs.from_email || 'tadas@pulsemcp.com',
          from_name: validatedArgs.from_name || 'Tadas',
          reply_to_email_address: validatedArgs.reply_to_email || 'tadas@pulsemcp.com',
          to_email_address: validatedArgs.recipient_email,
          subject: subject,
          content: content,
          campaign_identifier: `mcp-implementation-posting-${implementation.id}-${Date.now()}`,
        });

        // Format the response for MCP
        let responseContent = `Successfully sent notification email!\n\n`;
        responseContent += `**Implementation:** ${implementation.name} (${implementation.type})\n`;
        responseContent += `**URL:** ${implementationUrl}\n`;
        responseContent += `**Sent to:** ${validatedArgs.recipient_email}\n`;
        responseContent += `**Subject:** ${subject}\n`;
        responseContent += `**Email ID:** ${emailResult.id}\n`;
        responseContent += `**Sent at:** ${new Date(emailResult.send_timestamp_utc).toLocaleString()}\n\n`;
        responseContent += `The email has been sent via ${emailResult.sender_provider}.`;

        return {
          content: [
            {
              type: 'text',
              text: responseContent,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending notification: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
