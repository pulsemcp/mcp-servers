import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { extractHeadings } from '../utils/extract-text.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
} as const;

export const GetDocumentOutlineSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
});

const TOOL_DESCRIPTION = `List the headings in a Google Doc as a navigable outline.

Returns the title plus every TITLE/SUBTITLE/HEADING_1..HEADING_6 paragraph in
document order. Useful for quickly understanding a document's structure
without fetching the full body.

**Parameters:**
- document_id: Document ID or full Docs URL (required)

**Returns:**
Markdown-formatted outline indented by heading level.`;

export function getDocumentOutlineTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_document_outline',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
      },
      required: ['document_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetDocumentOutlineSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const doc = await client.getDocument(documentId);
        const headings = extractHeadings(doc);

        let output = `# Outline: ${doc.title || '(Untitled Document)'}\n\n`;
        output += `**Document ID:** ${doc.documentId}\n\n`;

        if (headings.length === 0) {
          output += '_No headings found in this document._\n';
        } else {
          for (const h of headings) {
            const indent = h.level === 0 ? '' : '  '.repeat(Math.max(0, h.level - 1));
            const prefix = h.level === 0 ? `[${h.styleType}]` : `H${h.level}`;
            output += `${indent}- ${prefix}: ${h.text}\n`;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('get-document-outline-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving outline: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
