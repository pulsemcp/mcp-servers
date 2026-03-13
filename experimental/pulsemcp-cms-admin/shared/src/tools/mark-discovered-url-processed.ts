import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DiscoveredUrlResult } from '../types.js';

const PARAM_DESCRIPTIONS = {
  id: 'The ID of the discovered URL to mark as processed',
  result:
    'Processing result: "posted" (published MCP implementation), "drafted" (created draft MCP implementation), "skipped" (not relevant), "rejected" (invalid), "error" (processing failed), or "needs_indexing" (awaiting indexing)',
  notes: 'Reason for skip/reject/error (e.g., "Not an MCP server", "Duplicate of ID 5678")',
  mcp_implementation_id: 'The ID of the created mcp_implementation (only when result is "posted")',
} as const;

const MarkDiscoveredUrlProcessedSchema = z.object({
  id: z.number().describe(PARAM_DESCRIPTIONS.id),
  result: z
    .enum(['posted', 'skipped', 'rejected', 'error', 'needs_indexing', 'drafted'])
    .describe(PARAM_DESCRIPTIONS.result),
  notes: z.string().optional().describe(PARAM_DESCRIPTIONS.notes),
  mcp_implementation_id: z.number().optional().describe(PARAM_DESCRIPTIONS.mcp_implementation_id),
});

export function markDiscoveredUrlProcessed(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'mark_discovered_url_processed',
    description: `Mark a single discovered URL as processed after the agent has handled it. Sets processed_at to the current timestamp and stores the result for audit trail.

Idempotent — calling on an already-processed URL updates the fields.

Use cases:
- Mark a URL as "posted" after publishing an MCP implementation from it
- Mark a URL as "drafted" after creating a draft MCP implementation from it
- Mark a URL as "skipped" if it's not relevant (e.g., not an MCP server)
- Mark a URL as "rejected" if it's invalid or a duplicate
- Mark a URL as "error" if processing failed
- Mark a URL as "needs_indexing" to flag it for the indexing pipeline`,
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: PARAM_DESCRIPTIONS.id },
        result: {
          type: 'string',
          enum: ['posted', 'skipped', 'rejected', 'error', 'needs_indexing', 'drafted'],
          description: PARAM_DESCRIPTIONS.result,
        },
        notes: { type: 'string', description: PARAM_DESCRIPTIONS.notes },
        mcp_implementation_id: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.mcp_implementation_id,
        },
      },
      required: ['id', 'result'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = MarkDiscoveredUrlProcessedSchema.parse(args);
      const client = clientFactory();

      try {
        const response = await client.markDiscoveredUrlProcessed({
          id: validatedArgs.id,
          result: validatedArgs.result as DiscoveredUrlResult,
          notes: validatedArgs.notes,
          mcp_implementation_id: validatedArgs.mcp_implementation_id,
        });

        let content = `Successfully marked discovered URL (ID: ${response.id}) as processed.\n`;
        content += `**Processed at:** ${response.processed_at}\n`;
        content += `**Result:** ${validatedArgs.result}`;
        if (validatedArgs.notes) {
          content += `\n**Notes:** ${validatedArgs.notes}`;
        }
        if (validatedArgs.mcp_implementation_id) {
          content += `\n**MCP Implementation ID:** ${validatedArgs.mcp_implementation_id}`;
        }

        return { content: [{ type: 'text', text: content }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error marking discovered URL as processed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
