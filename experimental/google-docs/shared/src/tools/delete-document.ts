import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  permanent:
    'When true, permanently deletes the document instead of moving it to trash. ' +
    'PERMANENT DELETION CANNOT BE UNDONE. Defaults to false (move to trash, ' +
    "recoverable from Drive's trash for 30 days).",
} as const;

export const DeleteDocumentSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  permanent: z.boolean().optional().describe(PARAM_DESCRIPTIONS.permanent),
});

const TOOL_DESCRIPTION = `Delete a Google Doc.

By default, moves the document to Drive's trash (reversible — the user can
restore it from drive.google.com within 30 days). Pass permanent=true to
bypass trash and remove the document immediately.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- permanent: Skip trash and delete permanently (optional, default false)

**Returns:**
Confirmation of deletion, including whether it was trashed or permanently deleted.

**Caveats:**
- The OAuth/service account that performed the delete must have ownership
  permission on the document.
- With \`drive.file\` scope (this server's default), the auth principal can
  only delete docs that were created or explicitly opened via this server.
- Permanent deletion is irreversible — prefer trash unless you have a strong
  reason.`;

export function deleteDocumentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'delete_document',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        permanent: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.permanent,
        },
      },
      required: ['document_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = DeleteDocumentSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        if (parsed.permanent) {
          await client.permanentlyDeleteDocument(documentId);
          return {
            content: [
              {
                type: 'text',
                text: `# Document Permanently Deleted\n\n**Document ID:** ${documentId}\n\n_This action cannot be undone._`,
              },
            ],
          };
        }

        const file = await client.trashDocument(documentId);
        let output = `# Document Moved to Trash\n\n`;
        output += `**Document ID:** ${file.id || documentId}\n`;
        if (file.name) output += `**Title:** ${file.name}\n`;
        output += `\nThe document is recoverable from Drive's trash for 30 days. `;
        output += `Pass \`permanent: true\` to delete immediately instead.`;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('delete-document-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
