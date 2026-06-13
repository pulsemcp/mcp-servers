import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';
import type { Category } from '../types.js';

const ACTION_ENUM = [
  'list',
  'create',
  'update',
  'delete',
  'reorder',
  'set_session_category',
] as const;

export const ManageCategoriesSchema = z.object({
  action: z.enum(ACTION_ENUM),
  category_id: z.number().nullable().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  is_frozen: z.boolean().optional(),
  ids: z.array(z.union([z.number(), z.literal('uncategorized')])).optional(),
  session_id: z.union([z.string(), z.number()]).optional(),
});

const TOOL_DESCRIPTION = `Manage categories used to organize sessions on the Agent Orchestrator dashboard.

Categories are the named sections sessions are grouped under. Sessions not assigned to a category fall under the built-in "Uncategorized" section.

**Actions:**
- **list**: List all categories ordered by position, with session counts.
- **create**: Create a new category (requires "name"; optional "description"). Names are unique case-insensitively (max 100 chars); description max 1000 chars.
- **update**: Rename, re-describe, or freeze/unfreeze a category (requires "category_id"; any subset of "name", "description", "is_frozen"). Omitted fields are left unchanged.
- **delete**: Delete a category (requires "category_id"). Sessions in it fall back to Uncategorized.
- **reorder**: Set the top-to-bottom order of categories (requires "ids" — an array of category IDs). Categories omitted keep their existing position. Include the string "uncategorized" to position the Uncategorized section.
- **set_session_category**: Assign a session to a category (requires "session_id"; "category_id" to assign, or omit/null to clear to Uncategorized).

**Note:** All freeze state uses "is_frozen".`;

export function manageCategoriesTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'manage_categories',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ACTION_ENUM,
          description: 'The category management action to perform.',
        },
        category_id: {
          type: ['number', 'null'],
          description:
            'Category ID. Required for "update" and "delete". For "set_session_category", the target category to assign (omit or null to clear to Uncategorized).',
        },
        name: {
          type: 'string',
          description:
            'Category name. Required for "create"; optional for "update". Unique case-insensitively, max 100 chars.',
        },
        description: {
          type: 'string',
          description:
            'Category description. Optional for "create" and "update". Max 1000 chars; blank clears it.',
        },
        is_frozen: {
          type: 'boolean',
          description: 'Freeze (true) or unfreeze (false) the category. Optional for "update".',
        },
        ids: {
          type: 'array',
          items: { oneOf: [{ type: 'number' }, { type: 'string', enum: ['uncategorized'] }] },
          description:
            'Required for "reorder". New top-to-bottom order of category IDs. Categories omitted keep their position. Use the string "uncategorized" to position the Uncategorized section.',
        },
        session_id: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
          description:
            'Session ID (numeric) or slug (string). Required for "set_session_category".',
        },
      },
      required: ['action'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = ManageCategoriesSchema.parse(args);
        const client = clientFactory();
        const { action, category_id, name, description, is_frozen, ids, session_id } = validated;

        const formatCategory = (cat: Category): string =>
          [
            `### ${cat.name} (ID: ${cat.id})`,
            `- **Position:** ${cat.position}`,
            `- **Frozen:** ${cat.is_frozen}`,
            cat.description ? `- **Description:** ${cat.description}` : null,
            `- **Sessions:** ${cat.session_count}`,
          ]
            .filter(Boolean)
            .join('\n');

        let result: string;

        switch (action) {
          case 'list': {
            const response = await client.listCategories();
            if (response.categories.length === 0) {
              result = '## Categories\n\nNo categories found.';
            } else {
              result = [
                `## Categories (${response.categories.length})`,
                '',
                ...response.categories.map(formatCategory),
              ].join('\n\n');
            }
            break;
          }

          case 'create': {
            if (!name) {
              return {
                content: [
                  { type: 'text', text: 'Error: "name" is required for the "create" action.' },
                ],
                isError: true,
              };
            }
            const cat = await client.createCategory({ name, description });
            result = ['## Category Created', '', formatCategory(cat)].join('\n');
            break;
          }

          case 'update': {
            if (category_id == null) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "category_id" is required for the "update" action.',
                  },
                ],
                isError: true,
              };
            }
            if (name === undefined && description === undefined && is_frozen === undefined) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: provide at least one of "name", "description", or "is_frozen" for the "update" action.',
                  },
                ],
                isError: true,
              };
            }
            const cat = await client.updateCategory(category_id, {
              ...(name !== undefined && { name }),
              ...(description !== undefined && { description }),
              ...(is_frozen !== undefined && { is_frozen }),
            });
            result = ['## Category Updated', '', formatCategory(cat)].join('\n');
            break;
          }

          case 'delete': {
            if (category_id == null) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "category_id" is required for the "delete" action.',
                  },
                ],
                isError: true,
              };
            }
            await client.deleteCategory(category_id);
            result = `## Category Deleted\n\nCategory ${category_id} has been deleted. Its sessions fall back to Uncategorized.`;
            break;
          }

          case 'reorder': {
            if (!ids || ids.length === 0) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "ids" (a non-empty array) is required for the "reorder" action.',
                  },
                ],
                isError: true,
              };
            }
            const response = await client.reorderCategories(ids);
            result = [
              '## Categories Reordered',
              '',
              ...response.categories.map(formatCategory),
            ].join('\n\n');
            break;
          }

          case 'set_session_category': {
            if (session_id === undefined) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Error: "session_id" is required for the "set_session_category" action.',
                  },
                ],
                isError: true,
              };
            }
            const response = await client.setSessionCategory(session_id, category_id ?? null);
            result = [
              '## Session Category Updated',
              '',
              `- **Session ID:** ${response.session.id}`,
              `- **Category:** ${response.session.category ? response.session.category.name : 'Uncategorized'}`,
              `- **Result:** ${response.message}`,
            ].join('\n');
            break;
          }

          default: {
            const _exhaustiveCheck: never = action;
            return {
              content: [{ type: 'text', text: `Error: Unknown action "${_exhaustiveCheck}"` }],
              isError: true,
            };
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error managing categories: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
