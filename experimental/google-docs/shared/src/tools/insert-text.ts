import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DocsBatchUpdateRequest } from '../types.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  index:
    'The 1-based document index where the text should be inserted. Use ' +
    'get_document with format="json" to discover precise indices. Index 1 ' +
    'inserts at the very beginning of the document body.',
  text: 'The plain text to insert at the given index.',
} as const;

export const InsertTextSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  index: z.number().int().min(1).describe(PARAM_DESCRIPTIONS.index),
  text: z.string().min(1).describe(PARAM_DESCRIPTIONS.text),
});

const TOOL_DESCRIPTION = `Insert plain text at a specific index in a Google Doc.

Convenience wrapper around update_document for the common insertText pattern.
Issues a single batchUpdate with one insertText request at the given location.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- index: Document index to insert at (required, min 1)
- text: Text to insert (required)

**Notes:**
- The Docs API uses 1-based indices over the document body.
- Use get_document with format="json" to find the index of a specific
  paragraph or text run.
- For more complex edits (deletions, replacements with formatting), use
  update_document directly.`;

export function insertTextTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'insert_text',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        index: {
          type: 'integer',
          minimum: 1,
          description: PARAM_DESCRIPTIONS.index,
        },
        text: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.text,
        },
      },
      required: ['document_id', 'index', 'text'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = InsertTextSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const requests: DocsBatchUpdateRequest[] = [
          {
            insertText: {
              location: { index: parsed.index },
              text: parsed.text,
            },
          },
        ];
        await client.batchUpdate(documentId, requests);

        let output = `# Text Inserted\n\n`;
        output += `**Document ID:** ${documentId}\n`;
        output += `**Inserted at index:** ${parsed.index}\n`;
        output += `**Characters:** ${parsed.text.length}\n`;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('insert-text-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error inserting text: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
