import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateStr = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');

const CREATE_DESCRIPTION = `Create a manual transaction. Use this for cash spending or other transactions Monarch can't import automatically.

The amount sign matters: negative = expense (money out), positive = income (money in).

Example response:
\`\`\`json
{
  "id": "tx_new123",
  "amount": -12.50,
  "date": "2026-01-20",
  "account": { "id": "acc_chk", "displayName": "Checking" },
  "merchant": { "id": "m_new", "name": "Coffee Shop" }
}
\`\`\`

**Use cases:**
- Log cash spending Monarch can't see
- Backfill a missing transaction
- Add a one-off income event (gift, refund, side income)`;

const UPDATE_DESCRIPTION = `Update fields on a transaction. Single tool that consolidates the per-field "setter" operations.

Provide \`id\` plus any subset of:
- \`amount\`, \`date\`, \`categoryId\` — patch the core fields
- \`merchantName\` — rename the merchant via free-form string (Monarch may auto-create a new merchant for unknown names; reassigning to an existing merchant by id is not supported)
- \`notes\` — replace the notes (pass an empty string to clear)
- \`hideFromReports\` — toggle the "hide from reports" flag
- \`reviewed\` — true marks the transaction reviewed; false puts it back in the review queue
- \`tagIds\` — full replace of the tag set (pass \`[]\` to remove all tags)

Omitted fields are left unchanged. The tool calls multiple Monarch endpoints under the hood (the GraphQL API has separate mutations for tags and review state) and rolls them up into one logical update.

Example response (the patched transaction, post-update):
\`\`\`json
{
  "id": "tx_abc",
  "amount": -42.18,
  "notes": "Reviewed and recategorized",
  "needsReview": false,
  "category": { "id": "cat_food", "name": "Groceries" },
  "tags": [{ "id": "tag_personal", "name": "Personal" }]
}
\`\`\`

**Use cases:**
- Recategorize a transaction
- Replace the tag set on a transaction
- Mark a transaction reviewed and update its notes in one call
- Hide a transfer from reports
- Bulk-recategorize: provide \`bulkTransactionIds\` + \`categoryId\` to apply one category to many transactions in one call`;

const DELETE_DESCRIPTION = `Permanently delete a transaction. This action cannot be undone.

Example response:
\`\`\`json
{ "deleted": true, "errors": [] }
\`\`\`

**Use cases:**
- Remove a duplicate manual entry
- Delete a transaction created by mistake`;

const SPLIT_DESCRIPTION = `Split a single transaction into multiple categorized parts. The split amounts must sum to the parent transaction's amount. Replaces any existing splits.

Returns the new child split transactions (id + amount). Use \`get_transactions\` with \`isSplit: true\` if you need richer details on the split children.

Example response:
\`\`\`json
[
  { "id": "split_1", "amount": -32.18 },
  { "id": "split_2", "amount": -10.00 }
]
\`\`\`

**Use cases:**
- Split a Costco run into "Groceries" and "Household"
- Allocate a shared dinner across multiple categories
- Break out the tip from a restaurant charge`;

export function transactionWriteTools(clientFactory: ClientFactory): RegisteredTool[] {
  const CreateSchema = z.object({
    accountId: z.string().min(1).describe('Account UUID to attribute the transaction to.'),
    amount: z.number().describe('Amount; negative for expenses, positive for income.'),
    date: dateStr.describe('Transaction date (YYYY-MM-DD).'),
    merchantName: z.string().min(1).describe('Merchant name (free-form string).'),
    categoryId: z
      .string()
      .min(1)
      .describe('Category UUID. Required by Monarch — use `get_categories` to find an id.'),
    notes: z.string().optional().describe('Optional notes attached to the transaction.'),
  });
  const create: RegisteredTool = {
    name: 'create_transaction',
    description: CREATE_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Account UUID.' },
        amount: {
          type: 'number',
          description: 'Amount; negative for expenses, positive for income.',
        },
        date: { type: 'string', description: 'Transaction date (YYYY-MM-DD).' },
        merchantName: { type: 'string' },
        categoryId: {
          type: 'string',
          description: 'Category UUID (required by Monarch).',
        },
        notes: { type: 'string' },
      },
      required: ['accountId', 'amount', 'date', 'merchantName', 'categoryId'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = CreateSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.createTransaction(parsed));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const UpdateSchema = z
    .object({
      id: z
        .string()
        .min(1)
        .optional()
        .describe('Transaction UUID to update. Required unless `bulkTransactionIds` is provided.'),
      bulkTransactionIds: z
        .array(z.string().min(1))
        .min(1)
        .optional()
        .describe(
          'Optional bulk mode: apply `categoryId` to every transaction in this list. Mutually exclusive with `id` and other fields besides `categoryId`.'
        ),
      amount: z
        .number()
        .optional()
        .describe('New amount (negative = expense, positive = income). Single-tx only.'),
      date: dateStr.optional().describe('New transaction date. Single-tx only.'),
      merchantName: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Rename the merchant via free-form string. Monarch may auto-create a new merchant for unknown names. Single-tx only.'
        ),
      categoryId: z
        .string()
        .optional()
        .describe(
          'New category UUID. The only field allowed in bulk mode (with `bulkTransactionIds`).'
        ),
      notes: z
        .string()
        .optional()
        .describe('Replace the notes (pass empty string to clear). Single-tx only.'),
      hideFromReports: z
        .boolean()
        .optional()
        .describe('Toggle the hide-from-reports flag. Single-tx only.'),
      reviewed: z
        .boolean()
        .optional()
        .describe('true = mark reviewed; false = put back in review queue. Single-tx only.'),
      tagIds: z
        .array(z.string())
        .optional()
        .describe('Full replacement of the tag set (pass [] to clear all tags). Single-tx only.'),
    })
    .superRefine((val, ctx) => {
      if (val.bulkTransactionIds && val.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Provide either `id` (single transaction) or `bulkTransactionIds` (bulk recategorize), not both.',
          path: ['id'],
        });
      }
      if (!val.bulkTransactionIds && !val.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Either `id` or `bulkTransactionIds` is required.',
          path: ['id'],
        });
      }
      if (val.bulkTransactionIds) {
        if (!val.categoryId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Bulk mode requires `categoryId`. Other fields are not supported in bulk.',
            path: ['categoryId'],
          });
        }
        const disallowed = [
          'amount',
          'date',
          'merchantName',
          'notes',
          'hideFromReports',
          'reviewed',
          'tagIds',
        ];
        for (const k of disallowed) {
          if ((val as Record<string, unknown>)[k] !== undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Bulk mode does not support \`${k}\`. Only \`categoryId\` may be applied across many transactions.`,
              path: [k],
            });
          }
        }
      }
    });

  const update: RegisteredTool = {
    name: 'update_transaction',
    description: UPDATE_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Transaction UUID.' },
        bulkTransactionIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Bulk mode: apply categoryId to every transaction in this list.',
        },
        amount: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD.' },
        merchantName: {
          type: 'string',
          description: 'Rename merchant via free-form string. Single-tx only.',
        },
        categoryId: { type: 'string' },
        notes: { type: 'string' },
        hideFromReports: { type: 'boolean' },
        reviewed: { type: 'boolean' },
        tagIds: { type: 'array', items: { type: 'string' } },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = UpdateSchema.parse(args ?? {});
        const client = await clientFactory();

        if (parsed.bulkTransactionIds) {
          return okJSON(
            await client.setTransactionCategory(parsed.bulkTransactionIds, parsed.categoryId!)
          );
        }

        const id = parsed.id!;
        const corePatch = {
          amount: parsed.amount,
          date: parsed.date,
          notes: parsed.notes,
          hideFromReports: parsed.hideFromReports,
          merchantName: parsed.merchantName,
          categoryId: parsed.categoryId,
        };
        const hasCorePatch = Object.values(corePatch).some((v) => v !== undefined);

        let result;
        if (hasCorePatch) {
          result = await client.updateTransaction({ id, ...corePatch });
        }

        if (parsed.tagIds !== undefined) {
          result = await client.setTransactionTags(id, parsed.tagIds);
        }
        if (parsed.reviewed !== undefined) {
          result = await client.markTransactionReviewed(id, parsed.reviewed);
        }

        if (!result) {
          // No fields specified — surface what the agent asked for so it sees
          // the no-op rather than an empty body.
          return okJSON({ id, updated: false, reason: 'No fields supplied.' });
        }
        return okJSON(result);
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const DeleteSchema = z.object({
    id: z.string().min(1).describe('Transaction UUID to delete.'),
  });
  const del: RegisteredTool = {
    name: 'delete_transaction',
    description: DELETE_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Transaction UUID.' } },
      required: ['id'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = DeleteSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.deleteTransaction(parsed.id));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const SplitSchema = z.object({
    id: z.string().min(1).describe('Parent transaction UUID.'),
    splits: z
      .array(
        z.object({
          amount: z.number().describe('Split amount — must sum to the parent transaction.'),
          categoryId: z.string().optional(),
          merchantId: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .min(2)
      .describe('At least two splits, summing to the parent transaction amount.'),
  });
  const split: RegisteredTool = {
    name: 'split_transaction',
    description: SPLIT_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        splits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              categoryId: { type: 'string' },
              merchantId: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['amount'],
          },
          minItems: 2,
        },
      },
      required: ['id', 'splits'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = SplitSchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(await client.splitTransaction(parsed.id, parsed.splits));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [create, update, del, split];
}
