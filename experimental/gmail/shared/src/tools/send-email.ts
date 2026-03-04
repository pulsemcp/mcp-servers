import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { getHeader } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  to: 'Recipient email address(es). For multiple recipients, separate with commas.',
  subject: 'Subject line of the email.',
  plaintext_body:
    'Plain text body content of the email. Exactly one of plaintext_body or html_body must be provided (unless sending a draft).',
  html_body:
    'HTML body content of the email for rich text formatting (links, bold, lists, etc.). Exactly one of plaintext_body or html_body must be provided (unless sending a draft).',
  cc: 'CC recipient email address(es). For multiple, separate with commas.',
  bcc: 'BCC recipient email address(es). For multiple, separate with commas.',
  thread_id:
    'Thread ID to add this email to an existing conversation. ' +
    'Get this from get_email_conversation. If provided, the email will be a reply in that thread.',
  reply_to_email_id:
    'Email ID to reply to. If provided, the email will be formatted as a reply ' +
    'with proper In-Reply-To and References headers. Also requires thread_id.',
  from_draft_id:
    'Draft ID to send. If provided, sends the specified draft instead of composing a new email. ' +
    'When using this, other parameters (to, subject, plaintext_body, etc.) are ignored.',
} as const;

export const SendEmailSchema = z
  .object({
    to: z.string().optional().describe(PARAM_DESCRIPTIONS.to),
    subject: z.string().optional().describe(PARAM_DESCRIPTIONS.subject),
    plaintext_body: z.string().optional().describe(PARAM_DESCRIPTIONS.plaintext_body),
    html_body: z.string().optional().describe(PARAM_DESCRIPTIONS.html_body),
    cc: z.string().optional().describe(PARAM_DESCRIPTIONS.cc),
    bcc: z.string().optional().describe(PARAM_DESCRIPTIONS.bcc),
    thread_id: z.string().optional().describe(PARAM_DESCRIPTIONS.thread_id),
    reply_to_email_id: z.string().optional().describe(PARAM_DESCRIPTIONS.reply_to_email_id),
    from_draft_id: z.string().optional().describe(PARAM_DESCRIPTIONS.from_draft_id),
  })
  .refine(
    (data) => {
      // Either from_draft_id is provided, OR to, subject, and one of plaintext_body/html_body are all provided
      if (data.from_draft_id) {
        return true;
      }
      return data.to && data.subject && (data.plaintext_body || data.html_body);
    },
    {
      message:
        'Either provide from_draft_id to send a draft, or provide to, subject, and one of plaintext_body or html_body to send a new email.',
    }
  );

const TOOL_DESCRIPTION = `Send an email immediately or send a previously created draft.

**Option 1: Send a new email**
- to: Recipient email address(es) (required)
- subject: Email subject line (required)
- plaintext_body: Plain text body content (provide this OR html_body)
- html_body: HTML body content for rich text formatting (provide this OR plaintext_body)
- cc: CC recipients (optional)
- bcc: BCC recipients (optional)
- thread_id: Thread ID to reply to an existing conversation (optional)
- reply_to_email_id: Email ID to reply to, sets proper reply headers (optional)

**Option 2: Send a draft**
- from_draft_id: ID of the draft to send (all other parameters are ignored)

**Body content:**
Provide exactly one of plaintext_body or html_body. Use html_body for rich formatting like hyperlinks, bold text, or lists.

**Sending a reply:**
To send a reply to an existing email:
1. Get the thread_id and email_id from get_email_conversation
2. Provide both thread_id and reply_to_email_id parameters

**Use cases:**
- Send a new email immediately
- Reply to an existing email conversation
- Send a draft that was created with draft_email

**Warning:** This action sends the email immediately and cannot be undone.`;

export function sendEmailTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'send_email',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        to: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.to,
        },
        subject: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.subject,
        },
        plaintext_body: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.plaintext_body,
        },
        html_body: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.html_body,
        },
        cc: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.cc,
        },
        bcc: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.bcc,
        },
        thread_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.thread_id,
        },
        reply_to_email_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.reply_to_email_id,
        },
        from_draft_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.from_draft_id,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = SendEmailSchema.parse(args ?? {});
        const client = clientFactory();

        // Option 2: Send a draft
        if (parsed.from_draft_id) {
          const sentEmail = await client.sendDraft(parsed.from_draft_id);

          return {
            content: [
              {
                type: 'text',
                text: `Draft sent successfully!\n\n**Message ID:** ${sentEmail.id}\n**Thread ID:** ${sentEmail.threadId}\n\nThe draft has been sent and removed from Drafts.`,
              },
            ],
          };
        }

        // Option 1: Send a new email
        // TypeScript knows these are defined due to the refine check
        const to = parsed.to!;
        const subject = parsed.subject!;

        let inReplyTo: string | undefined;
        let references: string | undefined;

        // If replying to an email, get the Message-ID for proper threading
        if (parsed.reply_to_email_id && parsed.thread_id) {
          const originalEmail = await client.getMessage(parsed.reply_to_email_id, {
            format: 'metadata',
            metadataHeaders: ['Message-ID', 'References'],
          });

          const messageId = getHeader(originalEmail, 'Message-ID');
          const originalReferences = getHeader(originalEmail, 'References');

          if (messageId) {
            inReplyTo = messageId;
            // Build references chain
            references = originalReferences ? `${originalReferences} ${messageId}` : messageId;
          }
        }

        const sentEmail = await client.sendMessage({
          to,
          subject,
          plaintextBody: parsed.plaintext_body,
          htmlBody: parsed.html_body,
          cc: parsed.cc,
          bcc: parsed.bcc,
          threadId: parsed.thread_id,
          inReplyTo,
          references,
        });

        let responseText = `Email sent successfully!\n\n**Message ID:** ${sentEmail.id}\n**Thread ID:** ${sentEmail.threadId}`;

        if (parsed.thread_id) {
          responseText += '\n\nThis email was sent as a reply in an existing conversation.';
        }

        responseText += `\n\n**To:** ${to}`;
        responseText += `\n**Subject:** ${subject}`;
        responseText += `\n**Format:** ${parsed.html_body ? 'HTML' : 'Plain text'}`;
        if (parsed.cc) {
          responseText += `\n**CC:** ${parsed.cc}`;
        }

        return {
          content: [
            {
              type: 'text',
              text: responseText,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error sending email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
