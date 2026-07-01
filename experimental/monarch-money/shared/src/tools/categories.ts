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
- Look up an existing tag's id before deleting it with \`delete_tag\`, or its \`color\` format before calling \`create_tag\``;

const CREATE_TAG_DESCRIPTION = `Create a new transaction tag. Returns the created tag ({ id, name, color, order }); Monarch assigns \`order\` server-side.

Both \`name\` and \`color\` are required. \`color\` is a hex string like the ones returned by \`get_tags\` (e.g. \`#19d2a5\`, \`#ff8800\`) — call \`get_tags\` first if you need to match an existing palette.

Example call:
\`\`\`json
{ "name": "Reimbursable", "color": "#19d2a5" }
\`\`\`

Example response:
\`\`\`json
{ "id": "tag_new", "name": "Reimbursable", "color": "#19d2a5", "order": 7 }
\`\`\`

**Use cases:**
- Add a tag you'll then assign to transactions via \`update_transaction\` (\`tagIds\`)
- Set up a tagging scheme without leaving the assistant`;

const DELETE_TAG_DESCRIPTION = `Delete a transaction tag by id. Removes the tag from the workspace and unassigns it from any transactions that carried it.

Returns \`{ deleted, errors }\`. \`deleted\` is confirmed by re-reading the tag list after the mutation (Monarch's raw \`deleted\` flag is not trusted).

Example call:
\`\`\`json
{ "id": "tag_old" }
\`\`\`

**Use cases:**
- Remove a stale or accidentally-created tag
- Clean up tags left behind by earlier automation

Use \`get_tags\` to look up the tag id first.`;

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

  const hexColor = z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex string like #19d2a5.');
  const CreateTagSchema = z.object({
    name: z.string().min(1).describe('Display name for the new tag.'),
    color: hexColor.describe(
      'Hex color for the tag (e.g. #19d2a5), matching the format returned by get_tags.'
    ),
  });
  const createTag: RegisteredTool = {
    name: 'create_tag',
    description: CREATE_TAG_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Display name for the new tag.' },
        color: {
          type: 'string',
          description: 'Hex color like #19d2a5 (6-digit, matches get_tags).',
        },
      },
      required: ['name', 'color'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = CreateTagSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.createTag({ name: parsed.name, color: parsed.color }));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const DeleteTagSchema = z.object({
    id: z.string().min(1).describe('Tag id to delete.'),
  });
  const deleteTag: RegisteredTool = {
    name: 'delete_tag',
    description: DELETE_TAG_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Tag id to delete.' },
      },
      required: ['id'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = DeleteTagSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.deleteTag(parsed.id));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getCategories, getTags, createTag, deleteTag];
}
