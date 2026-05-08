import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DocsBatchUpdateRequest } from '../types.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  title:
    'The title of the new document. Optional — defaults to "Untitled document" ' +
    'on the Google Docs side.',
  initial_content:
    'Optional plain-text content to insert into the freshly-created empty document. ' +
    'If provided, a follow-up batchUpdate is issued with a single insertText request.',
} as const;

export const CreateDocumentSchema = z.object({
  title: z.string().optional().describe(PARAM_DESCRIPTIONS.title),
  initial_content: z.string().optional().describe(PARAM_DESCRIPTIONS.initial_content),
});

const TOOL_DESCRIPTION = `Create a new Google Doc.

**Parameters:**
- title: Title of the new document (optional)
- initial_content: Plain-text content to seed the document with (optional)

**Returns:**
The new document's ID, title, and a docs.google.com link.

**Notes:**
- For complex initial formatting, follow up with update_document using the
  full batchUpdate request set.
- The newly-created doc is owned by the authenticating principal (or the
  impersonated user, in service-account mode).`;

export function createDocumentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'create_document',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.title,
        },
        initial_content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.initial_content,
        },
      },
    },
    handler: async (args: unknown) => {
      try {
        const parsed = CreateDocumentSchema.parse(args ?? {});
        const client = clientFactory();

        const doc = await client.createDocument({ title: parsed.title });

        if (parsed.initial_content && parsed.initial_content.length > 0) {
          const requests: DocsBatchUpdateRequest[] = [
            {
              insertText: {
                location: { index: 1 },
                text: parsed.initial_content,
              },
            },
          ];
          await client.batchUpdate(doc.documentId, requests);
        }

        let output = `# Document Created\n\n`;
        output += `**Document ID:** ${doc.documentId}\n`;
        output += `**Title:** ${doc.title || '(Untitled document)'}\n`;
        output += `**URL:** https://docs.google.com/document/d/${doc.documentId}/edit\n`;
        if (parsed.initial_content) {
          output += `**Initial content:** ${parsed.initial_content.length} character(s) inserted\n`;
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
        logError('create-document-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error creating document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
