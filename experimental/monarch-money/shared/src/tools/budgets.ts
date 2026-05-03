import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateStr = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');

const GET_BUDGETS_DESCRIPTION = `List per-category planned budget amounts across one or more months. Each row pairs a category with its planned amount for a single month — multi-month windows return one row per (category, month).

Date arguments take the year-month portion of the YYYY-MM-DD value; the day is ignored. Omit both dates to get the current month's budgets.

Example response:
\`\`\`json
[
  {
    "categoryId": "cat_food",
    "categoryName": "Groceries",
    "amount": 600,
    "month": "2026-01-01"
  },
  {
    "categoryId": "cat_dine",
    "categoryName": "Dining",
    "amount": 250,
    "month": "2026-01-01"
  }
]
\`\`\`

**Use cases:**
- Show "what is my budget for X?" for each category
- Audit current-period budget allocations before adjusting
- Pull a historical period's budget for retrospective analysis`;

const SET_BUDGET_DESCRIPTION = `Set the planned budget amount for a category for a single month. Pass \`applyToFuture: true\` to roll the change forward to all subsequent months; otherwise the change applies only to the month containing \`startDate\` (or the current month if \`startDate\` is omitted).

Returns the request echoed back along with the new \`budgetItemId\` — Monarch's mutation is intentionally minimal and doesn't surface the post-update Budget shape.

Example response:
\`\`\`json
{
  "budgetItemId": "bi_abc123",
  "categoryId": "cat_food",
  "amount": 650,
  "startDate": "2026-01-01",
  "applyToFuture": false
}
\`\`\`

**Use cases:**
- Bump a category's budget after recategorizing transactions
- Apply a new budget across all future months (\`applyToFuture: true\`)
- Adjust a one-off month's budget without touching ongoing settings`;

export function budgetTools(clientFactory: ClientFactory): RegisteredTool[] {
  const GetSchema = z.object({
    startDate: dateStr.optional().describe('Optional inclusive start date (YYYY-MM-DD).'),
    endDate: dateStr.optional().describe('Optional inclusive end date (YYYY-MM-DD).'),
  });
  const getBudgets: RegisteredTool = {
    name: 'get_budgets',
    description: GET_BUDGETS_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Inclusive start date (YYYY-MM-DD).',
        },
        endDate: {
          type: 'string',
          description: 'Inclusive end date (YYYY-MM-DD).',
        },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = GetSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.getBudgets(parsed.startDate, parsed.endDate));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const SetSchema = z.object({
    categoryId: z.string().min(1).describe('Category UUID to budget for.'),
    amount: z.number().describe('New budget amount.'),
    startDate: dateStr.optional().describe('Optional period start date (YYYY-MM-DD).'),
    applyToFuture: z
      .boolean()
      .optional()
      .describe('When true, this amount applies to all future periods. Default: false.'),
  });
  const setBudget: RegisteredTool = {
    name: 'set_budget_amount',
    description: SET_BUDGET_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        categoryId: { type: 'string', description: 'Category UUID.' },
        amount: { type: 'number', description: 'New budget amount.' },
        startDate: {
          type: 'string',
          description: 'Optional period start (YYYY-MM-DD).',
        },
        applyToFuture: {
          type: 'boolean',
          description: 'When true, applies to all future periods. Default: false.',
        },
      },
      required: ['categoryId', 'amount'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = SetSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.setBudgetAmount(parsed));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getBudgets, setBudget];
}
