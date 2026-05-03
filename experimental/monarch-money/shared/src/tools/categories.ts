import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const CATEGORIES_DESCRIPTION = `List every category configured on the workspace, with its parent group and "system category" flag (system categories are predefined by Monarch and can't be renamed).

Set \`includeGroups: true\` to also return the top-level category groups (Income, Expense, Transfer, etc.) — useful for rendering a grouped picker. The shape becomes \`{ categories, groups }\` instead of a bare array.

Example response (default):
\`\`\`json
[
  { "id": "cat_food", "name": "Groceries",   "isSystemCategory": false, "group": { "id": "grp_exp", "name": "Expense" } },
  { "id": "cat_dine", "name": "Dining",      "isSystemCategory": false, "group": { "id": "grp_exp", "name": "Expense" } }
]
\`\`\`

Example response (\`includeGroups: true\`):
\`\`\`json
{
  "categories": [
    { "id": "cat_food", "name": "Groceries", "group": { "id": "grp_exp", "name": "Expense" } }
  ],
  "groups": [
    { "id": "grp_exp", "name": "Expense" },
    { "id": "grp_inc", "name": "Income" }
  ]
}
\`\`\`

**Use cases:**
- Discover category ids for use with \`update_transaction\` or \`set_budget_amount\`
- Render a grouped category picker (with \`includeGroups: true\`)
- Identify which categories are system-defined vs. user-defined`;

const TAGS_DESCRIPTION = `List all transaction tags configured on the workspace, with name, color, and display order.

Example response:
\`\`\`json
[
  { "id": "tag_personal", "name": "Personal", "color": "#ff8800", "order": 1 },
  { "id": "tag_work",     "name": "Work",     "color": "#0088ff", "order": 2 }
]
\`\`\`

**Use cases:**
- Discover tag ids for use with \`update_transaction\` (\`tagIds\`)
- Render a tag picker

Note: tag creation is not exposed by this server. Create tags in the Monarch UI; they'll appear here automatically.`;

export function categoryTools(clientFactory: ClientFactory): RegisteredTool[] {
  const CategoriesSchema = z.object({
    includeGroups: z
      .boolean()
      .optional()
      .default(false)
      .describe('When true, also return the top-level category groups. Default: false.'),
  });
  const getCategories: RegisteredTool = {
    name: 'get_categories',
    description: CATEGORIES_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        includeGroups: {
          type: 'boolean',
          description: 'When true, return both categories and category groups. Default: false.',
        },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = CategoriesSchema.parse(args ?? {});
        const client = await clientFactory();
        if (!parsed.includeGroups) {
          return okJSON(await client.getCategories());
        }
        const [categories, groups] = await Promise.all([
          client.getCategories(),
          client.getCategoryGroups(),
        ]);
        return okJSON({ categories, groups });
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const getTags: RegisteredTool = {
    name: 'get_tags',
    description: TAGS_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async (): Promise<ToolResult> => {
      try {
        const client = await clientFactory();
        return okJSON(await client.getTags());
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getCategories, getTags];
}
