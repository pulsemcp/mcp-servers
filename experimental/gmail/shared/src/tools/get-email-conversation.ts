import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { Email, EmailPart } from '../types.js';
import { getHeader } from '../utils/email-helpers.js';

const PARAM_DESCRIPTIONS = {
  email_id:
    'The unique identifier of the email to retrieve. ' +
    'Obtain this from list_email_conversations or search_email_conversations.',
  include_html:
    'When true, includes the raw HTML body of the email (if available) in addition to the plain text. ' +
    'Useful for rendering emails with original formatting, creating screenshots, or archival workflows.',
} as const;

export const GetEmailConversationSchema = z.object({
  email_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.email_id),
  include_html: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_html),
});

const TOOL_DESCRIPTION = `Retrieve the full content of a specific email conversation by its ID.

Returns the complete email including headers, body content, and attachment information.

**Parameters:**
- email_id: The unique identifier of the email (required)
- include_html: When true, includes raw HTML body in addition to plain text (optional)

**Returns:**
Full email details including:
- Subject, From, To, Cc, Date headers
- Full message body (plain text preferred, HTML as fallback)
- Raw HTML body (when include_html is true and HTML content is available)
- List of attachments (if any)
- Labels assigned to the email

**Use cases:**
- Read the full content of an email after listing conversations
- Extract specific information from an email body
- Check attachment details
- Render emails with original HTML formatting (use include_html: true)
- Create email screenshots or archives with original styling

**Note:** Use list_email_conversations or search_email_conversations first to get email IDs.`;

/**
 * Decodes base64url encoded content
 */
function decodeBase64Url(data: string): string {
  // Convert base64url to base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  // Decode from base64
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Recursively extracts body content from email parts
 * Prefers text/plain over text/html
 */
function extractBodyContent(
  parts: EmailPart[] | undefined,
  preferredType: string = 'text/plain'
): string | null {
  if (!parts) return null;

  // First pass: look for exact match
  for (const part of parts) {
    if (part.mimeType === preferredType && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      const nested = extractBodyContent(part.parts, preferredType);
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * Gets the body content from an email
 */
function getEmailBody(email: Email): string {
  // Check if body is directly on payload
  if (email.payload?.body?.data) {
    return decodeBase64Url(email.payload.body.data);
  }

  // Try to extract from parts
  if (email.payload?.parts) {
    // Prefer plain text
    const plainText = extractBodyContent(email.payload.parts, 'text/plain');
    if (plainText) return plainText;

    // Fall back to HTML
    const html = extractBodyContent(email.payload.parts, 'text/html');
    if (html) {
      // Strip HTML tags for readability
      return html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }

  return '(No body content available)';
}

/**
 * Gets the raw HTML body content from an email (if available)
 */
function getEmailHtmlBody(email: Email): string | null {
  // Check if body is directly on payload and it's HTML
  if (email.payload?.body?.data && email.payload.mimeType === 'text/html') {
    return decodeBase64Url(email.payload.body.data);
  }

  // Try to extract HTML from parts
  if (email.payload?.parts) {
    const html = extractBodyContent(email.payload.parts, 'text/html');
    if (html) return html;
  }

  return null;
}

/**
 * Extracts attachment information from email parts
 */
function getAttachments(
  parts: EmailPart[] | undefined
): Array<{ filename: string; mimeType: string; size: number }> {
  if (!parts) return [];

  const attachments: Array<{ filename: string; mimeType: string; size: number }> = [];

  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
      });
    }
    if (part.parts) {
      attachments.push(...getAttachments(part.parts));
    }
  }

  return attachments;
}

/**
 * Formats an email for display
 */
function formatFullEmail(email: Email, options?: { includeHtml?: boolean }): string {
  const subject = getHeader(email, 'Subject') || '(No Subject)';
  const from = getHeader(email, 'From') || 'Unknown';
  const to = getHeader(email, 'To') || 'Unknown';
  const cc = getHeader(email, 'Cc');
  const date = getHeader(email, 'Date') || 'Unknown date';

  const body = getEmailBody(email);
  const attachments = getAttachments(email.payload?.parts);
  const labels = email.labelIds?.join(', ') || 'None';

  let output = `# Email Details

**ID:** ${email.id}
**Thread ID:** ${email.threadId}

## Headers
**Subject:** ${subject}
**From:** ${from}
**To:** ${to}`;

  if (cc) {
    output += `\n**Cc:** ${cc}`;
  }

  output += `
**Date:** ${date}
**Labels:** ${labels}

## Body

${body}`;

  // Include raw HTML body if requested
  if (options?.includeHtml) {
    const htmlBody = getEmailHtmlBody(email);
    if (htmlBody) {
      output += `

## HTML Body

\`\`\`html
${htmlBody}
\`\`\``;
    } else {
      output += `

## HTML Body

(No HTML content available)`;
    }
  }

  if (attachments.length > 0) {
    output += `\n\n## Attachments (${attachments.length})\n`;
    attachments.forEach((att, i) => {
      const sizeKb = Math.round(att.size / 1024);
      output += `${i + 1}. ${att.filename} (${att.mimeType}, ${sizeKb} KB)\n`;
    });
  }

  return output;
}

export function getEmailConversationTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_email_conversation',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        email_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.email_id,
        },
        include_html: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_html,
        },
      },
      required: ['email_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetEmailConversationSchema.parse(args ?? {});
        const client = clientFactory();

        const email = await client.getMessage(parsed.email_id, {
          format: 'full',
        });

        const formattedEmail = formatFullEmail(email, {
          includeHtml: parsed.include_html,
        });

        return {
          content: [
            {
              type: 'text',
              text: formattedEmail,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving email: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
