import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { EmailPart } from '../types.js';

/** Maximum total size (in bytes) for all attachments in a single request (25 MB) */
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;

const PARAM_DESCRIPTIONS = {
  email_id:
    'The unique identifier of the email containing the attachment(s). ' +
    'Obtain this from list_email_conversations, search_email_conversations, or get_email_conversation.',
  filename:
    'Optional filename to download a specific attachment. ' +
    'If omitted, all attachments on the email are downloaded.',
} as const;

export const DownloadEmailAttachmentsSchema = z.object({
  email_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.email_id),
  filename: z.string().optional().describe(PARAM_DESCRIPTIONS.filename),
});

const TOOL_DESCRIPTION = `Download attachment content from a specific email.

By default, downloads all attachments on the email. Use the filename parameter to download a specific one.

**Parameters:**
- email_id: The unique identifier of the email (required)
- filename: Download only the attachment matching this filename (optional)

**Returns:**
For text-based attachments (text/*, JSON, XML): the decoded text content.
For binary attachments (PDF, images, etc.): base64-encoded data.

**Use cases:**
- Download invoices, receipts, or documents attached to emails
- Extract data from CSV or text file attachments
- Access PDF attachments for processing
- Batch-download all attachments from an email in one call

**Size limit:** Total attachment size is capped at 25 MB per request.

**Note:** Use get_email_conversation first to see attachment metadata (filenames, sizes, types) before downloading.`;

interface AttachmentInfo {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

/**
 * Recursively extracts attachment info (including attachmentId) from email parts
 */
function getAttachmentInfos(parts: EmailPart[] | undefined): AttachmentInfo[] {
  if (!parts) return [];

  const attachments: AttachmentInfo[] = [];

  for (const part of parts) {
    if (part.filename && part.body?.attachmentId) {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType,
        size: part.body.size,
        attachmentId: part.body.attachmentId,
      });
    }
    if (part.parts) {
      attachments.push(...getAttachmentInfos(part.parts));
    }
  }

  return attachments;
}

/**
 * Converts base64url to standard base64
 */
function base64UrlToBase64(data: string): string {
  return data.replace(/-/g, '+').replace(/_/g, '/');
}

/**
 * Returns true if the MIME type represents text-based content
 */
function isTextMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('text/')) return true;
  if (mimeType === 'application/json') return true;
  if (mimeType === 'application/xml') return true;
  return false;
}

export function downloadEmailAttachmentsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'download_email_attachments',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        email_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.email_id,
        },
        filename: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.filename,
        },
      },
      required: ['email_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = DownloadEmailAttachmentsSchema.parse(args ?? {});
        const client = clientFactory();

        // Fetch the email to discover attachments
        const email = await client.getMessage(parsed.email_id, { format: 'full' });
        const allAttachments = getAttachmentInfos(email.payload?.parts);

        if (allAttachments.length === 0) {
          return {
            content: [{ type: 'text', text: 'No attachments found on this email.' }],
          };
        }

        // Filter by filename if specified
        let targetAttachments = allAttachments;
        if (parsed.filename) {
          targetAttachments = allAttachments.filter((a) => a.filename === parsed.filename);
          if (targetAttachments.length === 0) {
            const available = allAttachments.map((a) => a.filename).join(', ');
            return {
              content: [
                {
                  type: 'text',
                  text: `Attachment "${parsed.filename}" not found. Available attachments: ${available}`,
                },
              ],
              isError: true,
            };
          }
        }

        // Check total size
        const totalSize = targetAttachments.reduce((sum, a) => sum + a.size, 0);
        if (totalSize > MAX_TOTAL_SIZE) {
          const totalMb = (totalSize / (1024 * 1024)).toFixed(1);
          return {
            content: [
              {
                type: 'text',
                text:
                  `Total attachment size (${totalMb} MB) exceeds the 25 MB limit. ` +
                  `Use the filename parameter to download attachments individually.`,
              },
            ],
            isError: true,
          };
        }

        // Download all target attachments concurrently
        const results = await Promise.all(
          targetAttachments.map(async (att) => {
            const data = await client.getAttachment(parsed.email_id, att.attachmentId);
            return { ...att, data: data.data };
          })
        );

        // Build response
        const outputParts: string[] = [];

        // Summary header
        const summaryLines = results.map((r, i) => {
          const sizeKb = Math.round(r.size / 1024);
          return `${i + 1}. ${r.filename} (${r.mimeType}, ${sizeKb} KB)`;
        });
        outputParts.push(
          `# Downloaded Attachments (${results.length})\n\n${summaryLines.join('\n')}`
        );

        // Each attachment's content
        for (const result of results) {
          const base64Data = base64UrlToBase64(result.data);

          if (isTextMimeType(result.mimeType)) {
            const textContent = Buffer.from(base64Data, 'base64').toString('utf-8');
            outputParts.push(`---\n## ${result.filename}\n\n${textContent}`);
          } else {
            outputParts.push(
              `---\n## ${result.filename}\n\n` +
                `**MIME Type:** ${result.mimeType}\n` +
                `**Encoding:** base64\n\n` +
                `\`\`\`\n${base64Data}\n\`\`\``
            );
          }
        }

        return {
          content: [{ type: 'text', text: outputParts.join('\n\n') }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error downloading attachment(s): ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
