import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateStr = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');
const idArray = z.array(z.string().min(1)).optional();

const TRANSACTIONS_DESCRIPTION = `Query transactions in five different shapes — pick the one that matches what you actually want to know.

**View enum:**
- \`list\` (default) — paged list of transactions with filters. Returns \`{ totalCount, results }\`. Use this for "show me all transactions matching X."
- \`summary\` — aggregate totals (count, total income, total expense, average) over a date range. Fast top-line view. Requires \`startDate\` + \`endDate\`.
- \`cashflow\` — income / expense / savings / savings rate over a date range. Requires \`startDate\` + \`endDate\`.
- \`by_category\` — total spend per category over a date range. One row per category with the total amount. Requires \`startDate\` + \`endDate\`.
- \`recurring\` — forecast occurrences of recurring transactions Monarch has detected (subscriptions, payroll, rent). Each row carries the stream's name, frequency, expected date, and amount. Defaults to the next 90 days when \`startDate\`/\`endDate\` are omitted.

Filter parameters (\`accountIds\`, \`categoryIds\`, \`tagIds\`, \`merchantIds\`, \`search\`, \`amountGte\`, \`amountLte\`, \`needsReview\`, \`hideFromReports\`, \`isSplit\`, \`limit\`, \`offset\`) only apply when \`view: "list"\`. Other views ignore them.

Example response (\`view: "list"\`):
\`\`\`json
{
  "totalCount": 421,
  "results": [
    {
      "id": "tx_abc",
      "amount": -42.18,
      "date": "2026-01-15",
      "merchant": { "id": "m_1", "name": "Whole Foods" },
      "category": { "id": "cat_food", "name": "Groceries" },
      "account":  { "id": "acc_chk", "displayName": "Checking" },
      "needsReview": false
    }
  ]
}
\`\`\`

Example response (\`view: "summary"\`):
\`\`\`json
{ "count": 421, "totalIncome": 8420.00, "totalExpense": -5210.18, "averageTransaction": 7.62 }
\`\`\`

Example response (\`view: "cashflow"\`):
\`\`\`json
{
  "startDate": "2026-01-01", "endDate": "2026-01-31",
  "income": 8420.00, "expense": -5210.18, "savings": 3209.82, "savingsRate": 0.381
}
\`\`\`

Example response (\`view: "by_category"\`):
\`\`\`json
[
  { "categoryId": "cat_food", "categoryName": "Groceries", "amount": -612.40 },
  { "categoryId": "cat_dine", "categoryName": "Dining",    "amount": -284.10 }
]
\`\`\`

Example response (\`view: "recurring"\`):
\`\`\`json
[
  { "id": "rec_1", "name": "Netflix",   "amount": -15.49, "date": "2026-02-04", "frequency": "MONTHLY",  "isActive": true },
  { "id": "rec_2", "name": "Payroll",   "amount":  4210.0, "date": "2026-02-15", "frequency": "BIWEEKLY", "isActive": true }
]
\`\`\`

**Use cases:**
- "What did I spend this month?" → \`view: "summary"\` with last 30 days
- "How much did I save?" → \`view: "cashflow"\`
- "Where is my money going?" → \`view: "by_category"\`
- "What subscriptions am I on?" → \`view: "recurring"\`
- "Show me Whole Foods purchases over $50" → \`view: "list"\` with \`search\` + \`amountGte\`

To drill into a single transaction (including its splits), use \`get_transaction_details\`.`;

const TransactionsSchema = z
  .object({
    view: z
      .enum(['list', 'summary', 'cashflow', 'by_category', 'recurring'])
      .optional()
      .default('list')
      .describe(
        "Which view to return. 'list' (default), 'summary', 'cashflow', 'by_category', or 'recurring'."
      ),
    accountIds: idArray.describe('Filter to these account UUIDs (list only).'),
    categoryIds: idArray.describe('Filter to these category UUIDs (list only).'),
    tagIds: idArray.describe('Filter to these tag UUIDs (list only).'),
    merchantIds: idArray.describe('Filter to these merchant UUIDs (list only).'),
    startDate: dateStr
      .optional()
      .describe(
        'Inclusive start date (YYYY-MM-DD). Required for summary/cashflow/by_category. Optional for list/recurring.'
      ),
    endDate: dateStr
      .optional()
      .describe(
        'Inclusive end date (YYYY-MM-DD). Required for summary/cashflow/by_category. Optional for list/recurring.'
      ),
    search: z
      .string()
      .optional()
      .describe('Free-text search applied to merchant + notes (list only).'),
    amountGte: z
      .number()
      .optional()
      .describe('Match transactions with absolute amount >= this (list only).'),
    amountLte: z
      .number()
      .optional()
      .describe('Match transactions with absolute amount <= this (list only).'),
    needsReview: z
      .boolean()
      .optional()
      .describe('Filter to transactions needing review (list only).'),
    hideFromReports: z
      .boolean()
      .optional()
      .describe('Filter to transactions hidden from reports (list only).'),
    isSplit: z.boolean().optional().describe('Filter to split transactions (list only).'),
    limit: z
      .number()
      .int()
      .positive()
      .max(500)
      .optional()
      .describe('Max results per page (default 100, max 500). List only.'),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe('Pagination offset (default 0). List only.'),
  })
  .superRefine((val, ctx) => {
    if (
      (val.view === 'summary' || val.view === 'cashflow' || val.view === 'by_category') &&
      (!val.startDate || !val.endDate)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `view: "${val.view}" requires both startDate and endDate.`,
        path: ['startDate'],
      });
    }
  });

const DETAILS_DESCRIPTION = `Fetch a single transaction by id, including its splits (if any). Use after get_transactions (\`view: "list"\`) to drill into a specific row.

Example response:
\`\`\`json
{
  "id": "tx_abc",
  "amount": -42.18,
  "date": "2026-01-15",
  "merchant": { "id": "m_1", "name": "Whole Foods" },
  "category": { "id": "cat_food", "name": "Groceries" },
  "splits": [
    { "id": "split_1", "amount": -32.18, "category": { "id": "cat_food",  "name": "Groceries" } },
    { "id": "split_2", "amount": -10.00, "category": { "id": "cat_house", "name": "Household" } }
  ]
}
\`\`\`

**Use cases:**
- Inspect splits of a parent transaction
- Show notes / tags / review state for one specific transaction
- Verify a transaction id before calling \`update_transaction\` or \`delete_transaction\``;

export function transactionReadTools(clientFactory: ClientFactory): RegisteredTool[] {
  const getTransactions: RegisteredTool = {
    name: 'get_transactions',
    description: TRANSACTIONS_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: ['list', 'summary', 'cashflow', 'by_category', 'recurring'],
          description: 'Which view to return. Default: list.',
        },
        accountIds: { type: 'array', items: { type: 'string' } },
        categoryIds: { type: 'array', items: { type: 'string' } },
        tagIds: { type: 'array', items: { type: 'string' } },
        merchantIds: { type: 'array', items: { type: 'string' } },
        startDate: {
          type: 'string',
          description: 'Inclusive start date (YYYY-MM-DD).',
        },
        endDate: {
          type: 'string',
          description: 'Inclusive end date (YYYY-MM-DD).',
        },
        search: { type: 'string', description: 'Free-text search.' },
        amountGte: { type: 'number' },
        amountLte: { type: 'number' },
        needsReview: { type: 'boolean' },
        hideFromReports: { type: 'boolean' },
        isSplit: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1, maximum: 500 },
        offset: { type: 'integer', minimum: 0 },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = TransactionsSchema.parse(args ?? {});
        const client = await clientFactory();
        switch (parsed.view) {
          case 'summary':
            return okJSON(await client.getTransactionsSummary(parsed.startDate!, parsed.endDate!));
          case 'cashflow':
            return okJSON(await client.getCashflow(parsed.startDate!, parsed.endDate!));
          case 'by_category':
            return okJSON(await client.getSpendingByCategory(parsed.startDate!, parsed.endDate!));
          case 'recurring':
            return okJSON(await client.getRecurringTransactions(parsed.startDate, parsed.endDate));
          case 'list':
          default:
            return okJSON(
              await client.getTransactions({
                accountIds: parsed.accountIds,
                categoryIds: parsed.categoryIds,
                tagIds: parsed.tagIds,
                merchantIds: parsed.merchantIds,
                startDate: parsed.startDate,
                endDate: parsed.endDate,
                search: parsed.search,
                amountGte: parsed.amountGte,
                amountLte: parsed.amountLte,
                needsReview: parsed.needsReview,
                hideFromReports: parsed.hideFromReports,
                isSplit: parsed.isSplit,
                limit: parsed.limit,
                offset: parsed.offset,
              })
            );
        }
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const DetailsSchema = z.object({
    transactionId: z.string().min(1).describe('Transaction UUID.'),
  });
  const getDetails: RegisteredTool = {
    name: 'get_transaction_details',
    description: DETAILS_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        transactionId: { type: 'string', description: 'Transaction UUID.' },
      },
      required: ['transactionId'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = DetailsSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.getTransactionDetails(parsed.transactionId));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getTransactions, getDetails];
}
