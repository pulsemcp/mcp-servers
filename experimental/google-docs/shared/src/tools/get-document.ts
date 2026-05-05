import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { extractPlainText, extractHeadings } from '../utils/extract-text.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id:
    'The Google Docs document ID, or the full document URL (e.g. ' +
    'https://docs.google.com/document/d/.../edit). Both forms are accepted.',
  format:
    'Output format. "text" (default) returns plain text plus an outline of ' +
    'headings — best for reading. "json" returns the raw Docs API document ' +
    'resource (suitable when constructing batchUpdate requests that need ' +
    'startIndex/endIndex values).',
} as const;

export const GetDocumentSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  format: z.enum(['text', 'json']).optional().describe(PARAM_DESCRIPTIONS.format),
});

const TOOL_DESCRIPTION = `Fetch a Google Doc's content and metadata.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- format: "text" (default, human-readable) or "json" (raw Docs API resource)

**Returns:**
For format=text:
- Document title and ID
- Heading outline (TITLE / H1-H6) for navigation
- Full plain-text body

For format=json:
- The complete Docs API document resource as JSON. Use this when you need
  startIndex / endIndex values to build update_document requests.

**Tip:** If you only need the structure, use get_document_outline instead — it's lighter.`;

export function getDocumentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'get_document',
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
          enum: ['text', 'json'],
          description: PARAM_DESCRIPTIONS.format,
        },
      },
      required: ['document_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = GetDocumentSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const doc = await client.getDocument(documentId);

        if (parsed.format === 'json') {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(doc, null, 2),
              },
            ],
          };
        }

        const headings = extractHeadings(doc);
        const body = extractPlainText(doc);

        let output = `# ${doc.title || '(Untitled Document)'}\n\n`;
        output += `**Document ID:** ${doc.documentId}\n`;
        if (doc.revisionId) {
          output += `**Revision:** ${doc.revisionId}\n`;
        }
        output += '\n';

        if (headings.length > 0) {
          output += '## Outline\n\n';
          for (const h of headings) {
            const indent = h.level === 0 ? '' : '  '.repeat(Math.max(0, h.level - 1));
            const prefix = h.level === 0 ? `[${h.styleType}]` : `H${h.level}`;
            output += `${indent}- ${prefix}: ${h.text}\n`;
          }
          output += '\n';
        }

        output += '## Body\n\n';
        output += body.length > 0 ? body : '(empty document)';

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('get-document-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
