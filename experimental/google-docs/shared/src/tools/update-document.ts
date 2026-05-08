import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DocsBatchUpdateRequest } from '../types.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  requests:
    'Array of Docs API batchUpdate requests. Each item is a single-key object ' +
    'whose key is the operation name (e.g. insertText, deleteContentRange, ' +
    'updateTextStyle, replaceAllText, createParagraphBullets, ' +
    'updateParagraphStyle) and whose value is the operation payload. See ' +
    'https://developers.google.com/docs/api/reference/rest/v1/documents/request ' +
    'for the full schema. The requests are applied as a single atomic transaction.',
} as const;

export const UpdateDocumentSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  requests: z.array(z.record(z.unknown())).min(1).describe(PARAM_DESCRIPTIONS.requests),
});

const TOOL_DESCRIPTION = `Apply low-level Google Docs batchUpdate requests to a document (escape hatch).

This is the most powerful but also the most error-prone tool — it accepts the
raw Docs API request union directly. Use it for operations the convenience
tools (append_text, insert_text, replace_text) don't cover: styling, lists,
tables, deletions, paragraph formatting, etc.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- requests: Array of batchUpdate request objects (required, min 1).
  Examples:
    [{ "insertText": { "location": { "index": 1 }, "text": "Hello" } }]
    [{ "deleteContentRange": { "range": { "startIndex": 1, "endIndex": 5 } } }]
    [{ "replaceAllText": { "containsText": { "text": "{{name}}", "matchCase": true }, "replaceText": "Alice" } }]

**Tip:** Call get_document with format="json" first if you need exact
startIndex / endIndex values to target specific ranges.

**Returns:**
The Docs API batchUpdate response (replies array + documentId), serialized as JSON.`;

export function updateDocumentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'update_document',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        requests: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: true,
          },
          description: PARAM_DESCRIPTIONS.requests,
        },
      },
      required: ['document_id', 'requests'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = UpdateDocumentSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const response = await client.batchUpdate(
          documentId,
          parsed.requests as DocsBatchUpdateRequest[]
        );

        const repliesCount = Array.isArray(response.replies) ? response.replies.length : 0;
        let output = `# Document Updated\n\n`;
        output += `**Document ID:** ${response.documentId}\n`;
        output += `**Requests applied:** ${parsed.requests.length}\n`;
        output += `**Replies returned:** ${repliesCount}\n\n`;
        output += `## Raw Response\n\n\`\`\`json\n${JSON.stringify(response, null, 2)}\n\`\`\``;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('update-document-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error updating document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
