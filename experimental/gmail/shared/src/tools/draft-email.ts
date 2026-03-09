import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { getHeader } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  draft_id:
    'ID of an existing draft to update. If provided, the draft is replaced in-place ' +
    'with the new content. If omitted, a new draft is created. ' +
    'Get draft IDs from list_draft_emails or from a previous upsert_draft_email response.',
  to: 'Recipient email address(es). For multiple recipients, separate with commas.',
  subject: 'Subject line of the email.',
  plaintext_body:
    'Plain text body content of the email. At least one of plaintext_body or html_body must be provided. If both are provided, a multipart email is sent with both versions.',
  html_body:
    'HTML body content of the email for rich text formatting (links, bold, lists, etc.). At least one of plaintext_body or html_body must be provided. If both are provided, a multipart email is sent with both versions.',
  cc: 'CC recipient email address(es). For multiple, separate with commas.',
  bcc: 'BCC recipient email address(es). For multiple, separate with commas.',
  thread_id:
    'Thread ID to add this draft to an existing conversation. ' +
    'Get this from get_email_conversation. If provided, the draft will be a reply in that thread.',
  reply_to_email_id:
    'Email ID to reply to. If provided, the draft will be formatted as a reply ' +
    'with proper In-Reply-To and References headers. Also requires thread_id.',
} as const;

export const UpsertDraftEmailSchema = z
  .object({
    draft_id: z.string().optional().describe(PARAM_DESCRIPTIONS.draft_id),
    to: z.string().min(1).describe(PARAM_DESCRIPTIONS.to),
    subject: z.string().min(1).describe(PARAM_DESCRIPTIONS.subject),
    plaintext_body: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.plaintext_body),
    html_body: z.string().min(1).optional().describe(PARAM_DESCRIPTIONS.html_body),
    cc: z.string().optional().describe(PARAM_DESCRIPTIONS.cc),
    bcc: z.string().optional().describe(PARAM_DESCRIPTIONS.bcc),
    thread_id: z.string().optional().describe(PARAM_DESCRIPTIONS.thread_id),
    reply_to_email_id: z.string().optional().describe(PARAM_DESCRIPTIONS.reply_to_email_id),
  })
  .refine(
    (data) => {
      return Boolean(data.plaintext_body) || Boolean(data.html_body);
    },
    {
      message: 'At least one of plaintext_body or html_body must be provided.',
    }
  );

const TOOL_DESCRIPTION = `Create a new draft email or update an existing one.

**Parameters:**
- draft_id: ID of an existing draft to update (optional — omit to create a new draft)
- to: Recipient email address(es) (required)
- subject: Email subject line (required)
- plaintext_body: Plain text body content (at least one of plaintext_body or html_body required)
- html_body: HTML body content for rich text formatting (at least one of plaintext_body or html_body required)
- cc: CC recipients (optional)
- bcc: BCC recipients (optional)
- thread_id: Thread ID to reply to an existing conversation (optional)
- reply_to_email_id: Email ID to reply to, sets proper reply headers (optional)

**Body content:**
At least one of plaintext_body or html_body must be provided. If both are provided, a multipart email is sent with both plain text and HTML versions. Use html_body for rich formatting like hyperlinks, bold text, or lists.

**Creating a reply:**
To create a draft reply to an existing email:
1. Get the thread_id and email_id from get_email_conversation
2. Provide both thread_id and reply_to_email_id parameters

**Updating a draft:**
To update an existing draft, provide the draft_id from a previous upsert_draft_email response or from list_draft_emails. The draft is replaced in-place — all fields must be provided (not just the ones you want to change).

**Use cases:**
- Draft a new email for later review
- Prepare a reply to an email conversation
- Revise a draft after user feedback (without creating duplicates)
- Save an email without sending it immediately

**Note:** The draft will be saved in Gmail's Drafts folder. Use send_email with from_draft_id to send it.`;

export function upsertDraftEmailTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'upsert_draft_email',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        draft_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.draft_id,
        },
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
      },
      required: ['to', 'subject'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = UpsertDraftEmailSchema.parse(args ?? {});
        const client = clientFactory();

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

        const draftOptions = {
          to: parsed.to,
          subject: parsed.subject,
          plaintextBody: parsed.plaintext_body,
          htmlBody: parsed.html_body,
          cc: parsed.cc,
          bcc: parsed.bcc,
          threadId: parsed.thread_id,
          inReplyTo,
          references,
        };

        const isUpdate = Boolean(parsed.draft_id);
        const draft = isUpdate
          ? await client.updateDraft(parsed.draft_id!, draftOptions)
          : await client.createDraft(draftOptions);

        const action = isUpdate ? 'updated' : 'created';
        let responseText = `Draft ${action} successfully!\n\n**Draft ID:** ${draft.id}`;

        if (parsed.thread_id) {
          responseText += `\n**Thread ID:** ${parsed.thread_id}`;
          responseText += '\n\nThis draft is a reply in an existing conversation.';
        }

        responseText += `\n\n**To:** ${parsed.to}`;
        responseText += `\n**Subject:** ${parsed.subject}`;
        const format =
          parsed.plaintext_body && parsed.html_body
            ? 'Multipart (plain text + HTML)'
            : parsed.html_body
              ? 'HTML'
              : 'Plain text';
        responseText += `\n**Format:** ${format}`;
        if (parsed.cc) {
          responseText += `\n**CC:** ${parsed.cc}`;
        }
        if (parsed.bcc) {
          responseText += `\n**BCC:** ${parsed.bcc}`;
        }

        responseText +=
          "\n\nUse send_email with from_draft_id parameter to send this draft, or find it in Gmail's Drafts folder.";

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
              text: `Error ${(args as Record<string, unknown>)?.draft_id ? 'updating' : 'creating'} draft: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
