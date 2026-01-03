import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { Email, EmailPart } from '../types.js';

const PARAM_DESCRIPTIONS = {
  email_id:
    'The unique identifier of the email to retrieve. ' +
    'Obtain this from gmail_list_recent_emails.',
} as const;

export const GetEmailSchema = z.object({
  email_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.email_id),
});

const TOOL_DESCRIPTION = `Retrieve the full content of a specific email by its ID.

Returns the complete email including headers, body content, and attachment information.

**Parameters:**
- email_id: The unique identifier of the email (required)

**Returns:**
Full email details including:
- Subject, From, To, Cc, Date headers
- Full message body (plain text preferred, HTML as fallback)
- List of attachments (if any)
- Labels assigned to the email

**Use cases:**
- Read the full content of an email after listing recent emails
- Extract specific information from an email body
- Check attachment details

**Note:** Use gmail_list_recent_emails first to get email IDs.`;

/**
 * Extracts a header value from an email
 */
function getHeader(email: Email, headerName: string): string | undefined {
  return email.payload?.headers?.find((h) => h.name.toLowerCase() === headerName.toLowerCase())
    ?.value;
}

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
function formatFullEmail(email: Email): string {
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

  if (attachments.length > 0) {
    output += `\n\n## Attachments (${attachments.length})\n`;
    attachments.forEach((att, i) => {
      const sizeKb = Math.round(att.size / 1024);
      output += `${i + 1}. ${att.filename} (${att.mimeType}, ${sizeKb} KB)\n`;
    });
  }

  return output;
}

export function getEmailTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'gmail_get_email',
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
        const parsed = GetEmailSchema.parse(args ?? {});
        const client = clientFactory();

        const email = await client.getMessage(parsed.email_id, {
          format: 'full',
        });

        const formattedEmail = formatFullEmail(email);

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
