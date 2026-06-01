import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const GET_RULES_DESCRIPTION = `List every transaction rule configured on the workspace. Rules auto-classify imported transactions based on merchant/amount/account criteria.

Example response:
\`\`\`json
[
  {
    "id": "rule_1",
    "order": 1,
    "merchantCriteria": [{ "operator": "contains", "value": "Whole Foods" }],
    "amountCriteria": { "operator": "gte", "value": 50, "isExpense": true },
    "categoryIds": ["cat_food"],
    "accountIds": ["acc_chk"],
    "setCategoryAction": { "id": "cat_groceries", "name": "Groceries" },
    "setHideFromReportsAction": false,
    "addTagsAction": [{ "id": "tag_food", "name": "Food" }],
    "lastAppliedAt": "2026-04-12T18:22:01Z"
  }
]
\`\`\`

The action fields are echoed back in read shape: \`setCategoryAction\` as the
assigned category object and \`addTagsAction\` as the added tag objects. When you
write a rule (create/update), those same fields take a bare category-id string
and an array of tag-id strings respectively.

**Use cases:**
- Audit existing auto-categorization rules
- Inspect a rule's match criteria, actions, and last-run time
- Read a rule's full state before editing it (\`update_transaction_rule\` replaces the whole rule)

To change rules, use \`create_transaction_rule\`, \`update_transaction_rule\`, and \`delete_transaction_rule\`.`;

const CREATE_RULE_DESCRIPTION = `Create a transaction rule that auto-classifies imported transactions.

A rule has **criteria** (what it matches) and **actions** (what it does to matches). Supply at least one criterion and at least one action.

Criteria:
- \`merchantCriteria\` — array of { operator, value } matchers against the merchant name (e.g. operator \`contains\`).
- \`merchantCriteriaUseOriginalStatement\` — match against the raw bank statement text instead of the cleaned merchant name.
- \`amountCriteria\` — single { operator, value, isExpense } matcher (e.g. operator \`gte\`).
- \`categoryIds\` / \`accountIds\` — only match transactions already in these categories / accounts (use \`get_categories\` / \`get_accounts\` for ids).

Actions:
- \`setCategoryAction\` — category id to assign to matches (a bare id string, NOT an array; use \`get_categories\`).
- \`setHideFromReportsAction\` — hide matching transactions from reports.
- \`addTagsAction\` — tag ids to add to matches (use \`get_tags\`).

Set \`applyToExistingTransactions: true\` to retroactively run the rule against transactions you already have.

Monarch does not echo the created rule back, so this returns the **full refreshed rule list** — find the new rule (and its id, for later edits) there.

Example: "When the merchant contains 'Whole Foods', categorize as Groceries":
\`\`\`json
{
  "merchantCriteria": [{ "operator": "contains", "value": "Whole Foods" }],
  "setCategoryAction": "cat_groceries",
  "applyToExistingTransactions": true
}
\`\`\`

**Use cases:**
- Auto-categorize a recurring merchant
- Auto-hide transfers from reports
- Auto-tag a class of spending`;

const UPDATE_RULE_DESCRIPTION = `Update an existing transaction rule. Provide the rule \`id\` (from \`get_transaction_rules\`) plus the rule's complete desired criteria and actions.

**This is a FULL REPLACE, not a patch.** The fields you send define the rule's entire new state — any criterion or action you omit is REMOVED from the rule. You must re-supply at least one criterion (\`merchantCriteria\`, \`amountCriteria\`, \`categoryIds\`, or \`accountIds\`) AND at least one action (\`setCategoryAction\`, \`setHideFromReportsAction\`, or \`addTagsAction\`) on every call. Accepts the same criteria/action fields as \`create_transaction_rule\`.

**Safe workflow:** call \`get_transaction_rules\` first, take the rule's current criteria and actions, apply your change to that full state, and send the whole thing back. Sending only the one field you want to change will wipe out everything else on the rule.

Returns the full refreshed rule list (Monarch does not echo the updated rule back). Only the rule named by \`id\` is affected — sibling rules are untouched.

Example (a rule that matched "Whole Foods" → Groceries, now repointed to Dining while keeping its merchant criterion):
\`\`\`json
{
  "id": "rule_1",
  "merchantCriteria": [{ "operator": "contains", "value": "Whole Foods" }],
  "setCategoryAction": "cat_dining"
}
\`\`\`

**Use cases:**
- Repoint a rule to a different category (re-supplying its criteria)
- Tighten or loosen a rule's match criteria (re-supplying its actions)
- Toggle a rule's hide-from-reports action (re-supplying its criteria)`;

const DELETE_RULE_DESCRIPTION = `Permanently delete a transaction rule by id (from \`get_transaction_rules\`). This action cannot be undone. Existing transactions the rule already classified are not reverted.

Example response:
\`\`\`json
{ "deleted": true, "errors": [] }
\`\`\`

**Use cases:**
- Remove a rule that mis-categorizes transactions
- Clean up a rule that is no longer needed`;

const merchantCriterion = z.object({
  operator: z.string().min(1).describe('Match operator, e.g. "contains", "eq", "startsWith".'),
  value: z.string().describe('Value to match the merchant name against.'),
});

const amountCriterion = z.object({
  operator: z.string().min(1).describe('Amount operator, e.g. "gte", "lte", "eq".'),
  value: z.number().optional().describe('Amount threshold to compare against.'),
  isExpense: z
    .boolean()
    .optional()
    .describe('Whether the criterion targets expenses (true) or income.'),
});

// Shared criteria/action fields for create and update.
const ruleFields = {
  merchantCriteria: z
    .array(merchantCriterion)
    .optional()
    .describe('Merchant-name matchers (criteria).'),
  merchantCriteriaUseOriginalStatement: z
    .boolean()
    .optional()
    .describe('Match the raw statement text instead of the cleaned merchant.'),
  amountCriteria: amountCriterion.optional().describe('Single amount matcher (criteria).'),
  categoryIds: z
    .array(z.string())
    .optional()
    .describe('Only match transactions already in these category ids.'),
  accountIds: z
    .array(z.string())
    .optional()
    .describe('Only match transactions in these account ids.'),
  setCategoryAction: z
    .string()
    .optional()
    .describe('Action: category id to assign to matches (a single id string).'),
  setHideFromReportsAction: z
    .boolean()
    .optional()
    .describe('Action: hide matching transactions from reports.'),
  addTagsAction: z
    .array(z.string())
    .optional()
    .describe('Action: tag ids to add to matching transactions.'),
  applyToExistingTransactions: z
    .boolean()
    .optional()
    .describe('Retroactively apply the rule to existing transactions.'),
};

const CRITERIA_KEYS = ['merchantCriteria', 'amountCriteria', 'categoryIds', 'accountIds'] as const;
const ACTION_KEYS = ['setCategoryAction', 'setHideFromReportsAction', 'addTagsAction'] as const;

function hasAny(val: Record<string, unknown>, keys: readonly string[]): boolean {
  return keys.some((k) => val[k] !== undefined);
}

// Both create and update require at least one criterion AND at least one
// action. For create this defines a meaningful rule; for update it is enforced
// by Monarch itself, because `update_transaction_rule` is a FULL REPLACE — an
// update that omits all criteria or all actions would leave the rule with none,
// which the API silently refuses. Validating here turns that into a clear,
// up-front error instead of a confusing no-op.
function refineCriteriaAndActions(val: Record<string, unknown>, ctx: z.RefinementCtx): void {
  if (!hasAny(val, CRITERIA_KEYS)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Provide at least one criterion (merchantCriteria, amountCriteria, categoryIds, or accountIds) so the rule has something to match.',
      path: ['merchantCriteria'],
    });
  }
  if (!hasAny(val, ACTION_KEYS)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        'Provide at least one action (setCategoryAction, setHideFromReportsAction, or addTagsAction) so the rule does something.',
      path: ['setCategoryAction'],
    });
  }
}

// JSON-schema fragment shared by create/update (without `id`).
const ruleInputSchemaProps: Record<string, unknown> = {
  merchantCriteria: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        operator: { type: 'string' },
        value: { type: 'string' },
      },
      required: ['operator', 'value'],
    },
    description: 'Merchant-name matchers (criteria).',
  },
  merchantCriteriaUseOriginalStatement: {
    type: 'boolean',
    description: 'Match the raw statement text instead of the cleaned merchant.',
  },
  amountCriteria: {
    type: 'object',
    properties: {
      operator: { type: 'string' },
      value: { type: 'number' },
      isExpense: { type: 'boolean' },
    },
    required: ['operator'],
    description: 'Single amount matcher (criteria).',
  },
  categoryIds: {
    type: 'array',
    items: { type: 'string' },
    description: 'Only match transactions already in these category ids.',
  },
  accountIds: {
    type: 'array',
    items: { type: 'string' },
    description: 'Only match transactions in these account ids.',
  },
  setCategoryAction: {
    type: 'string',
    description: 'Action: category id to assign to matches (single id string).',
  },
  setHideFromReportsAction: {
    type: 'boolean',
    description: 'Action: hide matching transactions from reports.',
  },
  addTagsAction: {
    type: 'array',
    items: { type: 'string' },
    description: 'Action: tag ids to add to matching transactions.',
  },
  applyToExistingTransactions: {
    type: 'boolean',
    description: 'Retroactively apply the rule to existing transactions.',
  },
};

export function ruleTools(clientFactory: ClientFactory): RegisteredTool[] {
  const getRules: RegisteredTool = {
    name: 'get_transaction_rules',
    description: GET_RULES_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async (): Promise<ToolResult> => {
      try {
        const client = await clientFactory();
        return okJSON(await client.getTransactionRules());
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const CreateSchema = z.object({ ...ruleFields }).superRefine(refineCriteriaAndActions);
  const create: RegisteredTool = {
    name: 'create_transaction_rule',
    description: CREATE_RULE_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: { ...ruleInputSchemaProps },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = CreateSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.createTransactionRule(parsed));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  // Update is a FULL REPLACE, so it has the same criterion+action floor as
  // create — the caller must re-supply the rule's complete desired state.
  const UpdateSchema = z
    .object({
      id: z.string().min(1).describe('Rule id to update (from get_transaction_rules).'),
      ...ruleFields,
    })
    .superRefine(refineCriteriaAndActions);
  const update: RegisteredTool = {
    name: 'update_transaction_rule',
    description: UPDATE_RULE_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Rule id to update (from get_transaction_rules).',
        },
        ...ruleInputSchemaProps,
      },
      required: ['id'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = UpdateSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.updateTransactionRule(parsed));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const DeleteSchema = z.object({
    id: z.string().min(1).describe('Rule id to delete (from get_transaction_rules).'),
  });
  const del: RegisteredTool = {
    name: 'delete_transaction_rule',
    description: DELETE_RULE_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Rule id to delete (from get_transaction_rules).',
        },
      },
      required: ['id'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = DeleteSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.deleteTransactionRule(parsed.id));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getRules, create, update, del];
}
