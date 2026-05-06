import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

/**
 * Map from human-friendly format names to Drive export MIME types.
 * The text-y formats (markdown, html, plain text) are returned inline as
 * UTF-8 strings; binary formats (pdf, docx, odt, epub) are base64-encoded.
 */
const FORMAT_TO_MIMETYPE: Record<string, { mimeType: string; binary: boolean }> = {
  pdf: { mimeType: 'application/pdf', binary: true },
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    binary: true,
  },
  odt: { mimeType: 'application/vnd.oasis.opendocument.text', binary: true },
  rtf: { mimeType: 'application/rtf', binary: true },
  epub: { mimeType: 'application/epub+zip', binary: true },
  html: { mimeType: 'text/html', binary: false },
  txt: { mimeType: 'text/plain', binary: false },
  markdown: { mimeType: 'text/markdown', binary: false },
};

const FORMAT_NAMES = Object.keys(FORMAT_TO_MIMETYPE) as Array<keyof typeof FORMAT_TO_MIMETYPE>;

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  format: `Export format. One of: ${FORMAT_NAMES.join(', ')}.`,
} as const;

export const ExportDocumentSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  format: z
    .enum(['pdf', 'docx', 'odt', 'rtf', 'epub', 'html', 'txt', 'markdown'])
    .describe(PARAM_DESCRIPTIONS.format),
});

const TOOL_DESCRIPTION = `Export a Google Doc to another format via Drive's export endpoint.

Supported formats:
- pdf, docx, odt, rtf, epub: returned as base64-encoded data
- html, txt, markdown: returned as UTF-8 text inline

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- format: Target export format (required)

**Returns:**
For text formats: the converted document text inline.
For binary formats: a base64 string the caller can decode (with metadata
about the original byte length).

**Notes:**
- The export is performed by Google's converters; fidelity varies by format.
- Markdown export was added relatively recently and may not preserve all
  formatting from a doc with complex layout.`;

export function exportDocumentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'export_document',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        format: {
          type: 'string',
          enum: FORMAT_NAMES,
          description: PARAM_DESCRIPTIONS.format,
        },
      },
      required: ['document_id', 'format'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ExportDocumentSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const formatInfo = FORMAT_TO_MIMETYPE[parsed.format];
        const { bytes, mimeType } = await client.exportDocument(documentId, formatInfo.mimeType);

        if (formatInfo.binary) {
          const base64 = Buffer.from(bytes).toString('base64');
          let output = `# Document Exported (${parsed.format})\n\n`;
          output += `**Document ID:** ${documentId}\n`;
          output += `**Format:** ${parsed.format}\n`;
          output += `**MIME type:** ${mimeType}\n`;
          output += `**Byte length:** ${bytes.byteLength}\n\n`;
          output += `## Base64-encoded content\n\n\`\`\`\n${base64}\n\`\`\``;
          return {
            content: [{ type: 'text', text: output }],
          };
        }

        const text = Buffer.from(bytes).toString('utf-8');
        let output = `# Document Exported (${parsed.format})\n\n`;
        output += `**Document ID:** ${documentId}\n`;
        output += `**Format:** ${parsed.format}\n`;
        output += `**MIME type:** ${mimeType}\n`;
        output += `**Length:** ${text.length} characters\n\n`;
        output += `## Content\n\n${text}`;
        return {
          content: [{ type: 'text', text: output }],
        };
      } catch (error) {
        logError('export-document-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error exporting document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
