import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DocsBatchUpdateRequest } from '../types.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  find:
    'The exact text to search for. ALL occurrences in the document are replaced. ' +
    'For partial-string or regex replacement, use update_document with a ' +
    'replaceAllText request directly.',
  replace: 'The replacement text. Pass an empty string to delete all matches.',
  match_case: 'When true, the search is case-sensitive. Defaults to false (case-insensitive).',
} as const;

export const ReplaceTextSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  find: z.string().min(1).describe(PARAM_DESCRIPTIONS.find),
  replace: z.string().describe(PARAM_DESCRIPTIONS.replace),
  match_case: z.boolean().optional().describe(PARAM_DESCRIPTIONS.match_case),
});

const TOOL_DESCRIPTION = `Find-and-replace all occurrences of a string in a Google Doc.

Convenience wrapper around update_document's replaceAllText request.
Replaces every literal occurrence of \`find\` with \`replace\` across the
document body.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- find: Literal string to search for (required)
- replace: Replacement string (required, may be empty to delete matches)
- match_case: Whether the search is case-sensitive (optional, default false)

**Returns:**
The number of replacements made (from the Docs API response).

**Notes:**
- This is literal-text replacement only — no regex, no partial-token matching.
- For more flexible search/replace, use update_document directly.`;

export function replaceTextTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'replace_text',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        find: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.find,
        },
        replace: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.replace,
        },
        match_case: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.match_case,
        },
      },
      required: ['document_id', 'find', 'replace'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ReplaceTextSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        const requests: DocsBatchUpdateRequest[] = [
          {
            replaceAllText: {
              containsText: {
                text: parsed.find,
                matchCase: parsed.match_case ?? false,
              },
              replaceText: parsed.replace,
            },
          },
        ];
        const response = await client.batchUpdate(documentId, requests);

        const reply = response.replies?.[0] as
          | { replaceAllText?: { occurrencesChanged?: number } }
          | undefined;
        const occurrences = reply?.replaceAllText?.occurrencesChanged ?? 0;

        let output = `# Replacement Complete\n\n`;
        output += `**Document ID:** ${documentId}\n`;
        output += `**Find:** ${JSON.stringify(parsed.find)}\n`;
        output += `**Replace:** ${JSON.stringify(parsed.replace)}\n`;
        output += `**Match case:** ${parsed.match_case ?? false}\n`;
        output += `**Occurrences replaced:** ${occurrences}\n`;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('replace-text-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error replacing text: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
