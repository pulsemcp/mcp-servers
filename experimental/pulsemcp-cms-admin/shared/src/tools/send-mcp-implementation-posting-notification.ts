import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const SendMCPImplementationPostingNotificationSchema = z.object({
  mcp_implementation_id: z
    .number()
    .describe('The ID of the MCP implementation that was just posted'),
});

export function sendMCPImplementationPostingNotification(
  _server: Server,
  clientFactory: ClientFactory
) {
  return {
    name: 'send_mcp_implementation_posting_notification',
    description: `Send an email notification to the submitter of an MCP implementation informing them that their submission is now live on PulseMCP.com. This tool automatically sends (not drafts) the notification email.

This is similar to the "Draft Notification" button in the admin UI, but instead of opening a draft email form, it immediately sends the email notification to the submitter.

**Requirements:**
- The MCP implementation must have status "live"
- The implementation's internal_notes field must contain an email address
- The email address will be automatically extracted from the internal_notes

**Email content:**
The tool sends a personalized notification with:
- Subject: "Thanks for your submission to PulseMCP!"
- A thank you message
- A direct link to the live listing (either /servers/{slug} or /clients/{slug})
- An offer to help and encouragement to reach out
- Signed by Tadas (PulseMCP)

**Example use cases:**
- After approving a draft MCP implementation, send immediate notification to the submitter
- Batch notify multiple submitters after a review session
- Re-send notification if the first email bounced or was missed

**Example successful response:**
Email sent successfully to john.doe@example.com

**Example error response:**
Error: MCP implementation must be in 'live' status to send notification (current status: draft)
Error: No email address found in internal notes

**Implementation notes:**
- Email is sent via SendGrid with proper tracking settings
- Email address is extracted from internal_notes field
- The tool validates the implementation status before sending
- Uses the same copywriting pattern as the Draft Notification feature`,
    inputSchema: {
      type: 'object',
      properties: {
        mcp_implementation_id: {
          type: 'number',
          description: 'The ID of the MCP implementation that was just posted',
        },
      },
      required: ['mcp_implementation_id'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = SendMCPImplementationPostingNotificationSchema.parse(args);
      const client = clientFactory();

      try {
        // Fetch the implementation details
        const implementations = await client.searchMCPImplementations({
          query: '',
          status: 'all',
          limit: 1000,
        });

        const implementation = implementations.implementations.find(
          (impl) => impl.id === validatedArgs.mcp_implementation_id
        );

        if (!implementation) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: MCP implementation with ID ${validatedArgs.mcp_implementation_id} not found`,
              },
            ],
            isError: true,
          };
        }

        // Validate status
        if (implementation.status !== 'live') {
          return {
            content: [
              {
                type: 'text',
                text: `Error: MCP implementation must be in 'live' status to send notification (current status: ${implementation.status})`,
              },
            ],
            isError: true,
          };
        }

        // Extract email from internal notes (simulating the email_in_notes method)
        // Look for email addresses in the format: word@domain.tld
        const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
        const internalNotes = (implementation as any).internal_notes || '';
        const emailMatch = internalNotes.match(emailRegex);
        const recipientEmail = emailMatch ? emailMatch[0] : null;

        if (!recipientEmail) {
          return {
            content: [
              {
                type: 'text',
                text: `Error: No email address found in internal notes for implementation ID ${validatedArgs.mcp_implementation_id}`,
              },
            ],
            isError: true,
          };
        }

        // Fetch full implementation details with associated server/client
        let implementationUrl = '';
        if (implementation.mcp_server_id) {
          const server = await client.getMCPServerById(implementation.mcp_server_id);
          implementationUrl = `https://www.pulsemcp.com/servers/${server?.slug || implementation.slug}`;
        } else if (implementation.mcp_client_id) {
          const mcpClient = await client.getMCPClientById(implementation.mcp_client_id);
          implementationUrl = `https://www.pulsemcp.com/clients/${mcpClient?.slug || implementation.slug}`;
        } else {
          implementationUrl = `https://www.pulsemcp.com/servers/${implementation.slug}`;
        }

        // Send the email
        const emailContent = `Hi there,

Your submission is now live here: ${implementationUrl}

Let us know how we can be helpful to you!

Best,
Tadas`;

        await client.sendEmail({
          to_email_address: recipientEmail,
          from_email_address: 'tadas@pulsemcp.com',
          from_name: 'Tadas from PulseMCP',
          reply_to_email_address: 'tadas@pulsemcp.com',
          subject: 'Thanks for your submission to PulseMCP!',
          content: emailContent,
        });

        return {
          content: [
            {
              type: 'text',
              text: `✓ Email sent successfully to ${recipientEmail}\n\nSubject: Thanks for your submission to PulseMCP!\n\nThe notification has been sent informing them that their submission is now live at:\n${implementationUrl}`,
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
