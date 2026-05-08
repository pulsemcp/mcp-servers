import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DocsBatchUpdateRequest } from '../types.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { getEndOfBodyIndex } from '../utils/extract-text.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  text:
    'The plain text to append to the end of the document. Newlines are preserved. ' +
    'For most cases, prefix with "\\n" if you want a paragraph break before the new content.',
} as const;

export const AppendTextSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  text: z.string().min(1).describe(PARAM_DESCRIPTIONS.text),
});

const TOOL_DESCRIPTION = `Append plain text to the end of a Google Doc.

Convenience wrapper around update_document. Looks up the current end-of-body
index, then issues an insertText request that adds the provided text just
before the trailing newline.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- text: Plain text to append (required)

**Notes:**
- For formatted edits or precise placement, use update_document directly.
- This requires a round-trip to fetch the document first to determine the
  insertion index.`;

export function appendTextTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'append_text',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        text: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.text,
        },
      },
      required: ['document_id', 'text'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = AppendTextSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const doc = await client.getDocument(documentId);
        const insertIndex = getEndOfBodyIndex(doc);

        const requests: DocsBatchUpdateRequest[] = [
          {
            insertText: {
              location: { index: insertIndex },
              text: parsed.text,
            },
          },
        ];
        await client.batchUpdate(documentId, requests);

        let output = `# Text Appended\n\n`;
        output += `**Document ID:** ${documentId}\n`;
        output += `**Inserted at index:** ${insertIndex}\n`;
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
        logError('append-text-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error appending text: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
