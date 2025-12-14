import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IStorageClient } from '../storage-client/types.js';

// =============================================================================
// PARAMETER DESCRIPTIONS
// =============================================================================

const PARAM_DESCRIPTIONS = {
  prefix:
    'Filter files by path prefix. Acts like a folder path filter. ' +
    'Examples: "documents/", "data/2024/", "images/thumbnails/"',
  limit: 'Maximum number of files to return. Default: 100, Max: 1000',
  page_token: 'Pagination token from a previous search result to get the next page of results',
  delimiter:
    'Character used for folder-like grouping. Typically "/" to list files at a specific level. ' +
    'When set, results will show items at the current prefix level without descending into sub-folders.',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const SearchFilesSchema = z.object({
  prefix: z.string().optional().describe(PARAM_DESCRIPTIONS.prefix),
  limit: z.number().min(1).max(1000).optional().describe(PARAM_DESCRIPTIONS.limit),
  page_token: z.string().optional().describe(PARAM_DESCRIPTIONS.page_token),
  delimiter: z.string().optional().describe(PARAM_DESCRIPTIONS.delimiter),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Search and list files in cloud storage.

Lists files in the cloud storage bucket, optionally filtered by path prefix. Supports pagination for large result sets.

**Parameters:**
- \`prefix\`: Filter files by path prefix (like a folder path)
- \`limit\`: Maximum results to return (default: 100, max: 1000)
- \`page_token\`: Token from previous search for pagination
- \`delimiter\`: Character for folder-like behavior (typically "/")

**Returns:**
JSON object with:
- \`files\`: Array of file metadata (path, size, contentType, timestamps)
- \`hasMore\`: Boolean indicating if more results are available
- \`nextPageToken\`: Token to use for getting the next page

**Use cases:**
- List all files in a "folder" (using prefix)
- Find files matching a naming pattern
- Paginate through large file collections
- Explore the bucket structure

**Examples:**
- List all files: \`{}\`
- List files in a folder: \`{"prefix": "documents/"}\`
- Get next page: \`{"page_token": "token-from-previous-result"}\``;

// =============================================================================
// TOOL FACTORY
// =============================================================================

export function searchFilesTool(_server: Server, clientFactory: () => IStorageClient) {
  return {
    name: 'search_files',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        prefix: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.prefix,
        },
        limit: {
          type: 'number',
          default: 100,
          minimum: 1,
          maximum: 1000,
          description: PARAM_DESCRIPTIONS.limit,
        },
        page_token: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.page_token,
        },
        delimiter: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.delimiter,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = SearchFilesSchema.parse(args);
        const client = clientFactory();

        const result = await client.searchFiles({
          prefix: validatedArgs.prefix,
          limit: validatedArgs.limit,
          pageToken: validatedArgs.page_token,
          delimiter: validatedArgs.delimiter,
        });

        const response = {
          success: true,
          totalReturned: result.files.length,
          hasMore: result.hasMore,
          nextPageToken: result.nextPageToken,
          files: result.files.map((file) => ({
            path: file.path,
            size: file.size,
            contentType: file.contentType,
            createdAt: file.createdAt.toISOString(),
            updatedAt: file.updatedAt.toISOString(),
            customMetadata: file.customMetadata,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching files: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
