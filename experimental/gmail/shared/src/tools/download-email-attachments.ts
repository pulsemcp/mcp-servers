import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { writeFile, mkdir } from 'fs/promises';
import { join, basename, extname } from 'path';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { EmailPart } from '../types.js';

/** Maximum total size (in bytes) for inline attachments (25 MB) */
const MAX_INLINE_SIZE = 25 * 1024 * 1024;

const PARAM_DESCRIPTIONS = {
  email_id:
    'The unique identifier of the email containing the attachment(s). ' +
    'Obtain this from list_email_conversations, search_email_conversations, or get_email_conversation.',
  filename:
    'Optional filename to download a specific attachment. ' +
    'If omitted, all attachments on the email are downloaded.',
  inline:
    'When true, return attachment content directly in the response (text-based files as text, binary as base64). ' +
    'When false (default), save attachments to /tmp/ and return file paths.',
} as const;

export const DownloadEmailAttachmentsSchema = z.object({
  email_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.email_id),
  filename: z.string().optional().describe(PARAM_DESCRIPTIONS.filename),
  inline: z.boolean().optional().default(false).describe(PARAM_DESCRIPTIONS.inline),
});

const TOOL_DESCRIPTION = `Download attachment content from a specific email.

By default, saves all attachments to /tmp/ and returns the file paths. Use the inline parameter to return content directly in the response instead.

**Parameters:**
- email_id: The unique identifier of the email (required)
- filename: Download only the attachment matching this filename (optional)
- inline: If true, return content in the response instead of saving to files (optional, default: false)

**Default behavior (inline=false):**
Saves attachments as files to /tmp/ and returns the full file paths. Best for binary files or large attachments where you need to process the file afterward.

**Inline behavior (inline=true):**
Returns content directly. Text-based attachments (text/*, JSON, XML) are decoded to text. Binary attachments (PDF, images, etc.) are returned as base64. Total size is capped at 25 MB.

**Use cases:**
- Download invoices, receipts, or documents attached to emails
- Extract data from CSV or text file attachments
- Access PDF attachments for processing
- Batch-download all attachments from an email in one call

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
  if (mimeType.endsWith('+json') || mimeType.endsWith('+xml')) return true;
  return false;
}

interface DownloadedAttachment extends AttachmentInfo {
  data: string;
}

/**
 * Builds inline response with attachment content in the response text
 */
function buildInlineResponse(results: DownloadedAttachment[]) {
  const outputParts: string[] = [];

  const summaryLines = results.map((r, i) => {
    const sizeKb = Math.round(r.size / 1024);
    return `${i + 1}. ${r.filename} (${r.mimeType}, ${sizeKb} KB)`;
  });
  outputParts.push(`# Downloaded Attachments (${results.length})\n\n${summaryLines.join('\n')}`);

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
}

/**
 * Sanitizes a filename to prevent path traversal attacks.
 * Strips directory components and falls back to 'attachment' if empty.
 */
function sanitizeFilename(filename: string): string {
  return basename(filename) || 'attachment';
}

/**
 * Returns a unique filename, appending (1), (2), etc. if the name already exists.
 */
function deduplicateFilename(name: string, usedNames: Set<string>): string {
  if (!usedNames.has(name)) {
    usedNames.add(name);
    return name;
  }
  const ext = extname(name);
  const base = name.slice(0, name.length - ext.length);
  let counter = 1;
  let candidate: string;
  do {
    candidate = `${base} (${counter})${ext}`;
    counter++;
  } while (usedNames.has(candidate));
  usedNames.add(candidate);
  return candidate;
}

/**
 * Saves attachments to /tmp/ and returns file paths
 */
async function buildFileResponse(results: DownloadedAttachment[], emailId: string) {
  const safeEmailId = emailId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = join('/tmp', `gmail-attachments-${safeEmailId}`);
  await mkdir(dir, { recursive: true });

  const savedFiles: { filename: string; path: string; mimeType: string; size: number }[] = [];
  const usedNames = new Set<string>();

  for (const result of results) {
    const base64Data = base64UrlToBase64(result.data);
    const buffer = Buffer.from(base64Data, 'base64');
    const safeName = deduplicateFilename(sanitizeFilename(result.filename), usedNames);
    const filePath = join(dir, safeName);
    await writeFile(filePath, buffer);
    savedFiles.push({
      filename: result.filename,
      path: filePath,
      mimeType: result.mimeType,
      size: buffer.length,
    });
  }

  const outputParts: string[] = [];

  const summaryLines = savedFiles.map((f, i) => {
    const sizeKb = Math.round(f.size / 1024);
    return `${i + 1}. ${f.filename} (${f.mimeType}, ${sizeKb} KB)`;
  });
  outputParts.push(`# Downloaded Attachments (${savedFiles.length})\n\n${summaryLines.join('\n')}`);

  outputParts.push('## Saved Files\n');
  for (const file of savedFiles) {
    outputParts.push(`- **${file.filename}**: \`${file.path}\``);
  }

  return {
    content: [{ type: 'text', text: outputParts.join('\n') }],
  };
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
        inline: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.inline,
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

        // For inline mode, enforce size limit
        if (parsed.inline) {
          const totalSize = targetAttachments.reduce((sum, a) => sum + a.size, 0);
          if (totalSize > MAX_INLINE_SIZE) {
            const totalMb = (totalSize / (1024 * 1024)).toFixed(1);
            return {
              content: [
                {
                  type: 'text',
                  text:
                    `Total attachment size (${totalMb} MB) exceeds the 25 MB limit for inline mode. ` +
                    `Use inline=false (default) to save to files, or use the filename parameter to download individually.`,
                },
              ],
              isError: true,
            };
          }
        }

        // Download all target attachments concurrently
        const results = await Promise.all(
          targetAttachments.map(async (att) => {
            const data = await client.getAttachment(parsed.email_id, att.attachmentId);
            return { ...att, data: data.data };
          })
        );

        if (parsed.inline) {
          return buildInlineResponse(results);
        } else {
          return await buildFileResponse(results, parsed.email_id);
        }
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
