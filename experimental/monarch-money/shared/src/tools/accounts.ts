import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';
import type { Account, Holding } from '../types.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateStr = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');

const ACCOUNTS_DESCRIPTION = `List every account connected to the Monarch Money workspace, including assets and liabilities.

Returns balance, type/subtype, hidden/sync flags, last update time, and the linked institution. Use this as the starting point for nearly every read operation — most other tools take an account id you'll find here.

Set \`includeHoldings: true\` to attach investment holdings (ticker, quantity, value, cost basis) to each account that tracks them. Holdings are an extra GraphQL request per account, so omit the flag when you only need balances.

Example response (with \`includeHoldings: true\`):
\`\`\`json
[
  {
    "id": "acc_123",
    "displayName": "Vanguard Brokerage",
    "currentBalance": 84210.55,
    "displayBalance": 84210.55,
    "isAsset": true,
    "type": { "name": "brokerage", "display": "Brokerage" },
    "institution": { "id": "inst_42", "name": "Vanguard" },
    "holdings": [
      { "id": "h_1", "ticker": "VTI", "name": "Vanguard Total Stock Market", "quantity": 312.5, "costBasis": 65000, "value": 78912.5 }
    ]
  }
]
\`\`\`

**Use cases:**
- Discover account ids for use with other tools
- Render a "connected accounts" overview
- Compute total balance per institution
- Pull holdings for portfolio analysis (with \`includeHoldings: true\`)`;

const BALANCE_HISTORY_DESCRIPTION = `Daily balance snapshots for a single account over a date range. Useful for charting a balance curve, computing average balance, or spotting a sudden drop.

Example response:
\`\`\`json
[
  { "date": "2026-01-01", "balance": 4321.55 },
  { "date": "2026-01-02", "balance": 4180.22 }
]
\`\`\`

**Use cases:**
- Plot a per-account balance chart
- Compute month-over-month balance change for one account
- Investigate a specific date when a balance dropped unexpectedly`;

const REFRESH_DESCRIPTION = `Force a sync against the upstream financial institutions for the given accounts (or all accounts when omitted). This is a long-running operation on Monarch's side — the tool returns immediately once the sync is enqueued.

Example response:
\`\`\`json
{ "enqueued": true, "accounts": "all", "errors": [] }
\`\`\`

**Use cases:**
- Pull the latest balances before generating a report
- Recover from a stuck or stale account sync
- Force a refresh after manually fixing institution credentials`;

export function accountTools(clientFactory: ClientFactory): RegisteredTool[] {
  const AccountsSchema = z.object({
    includeHoldings: z
      .boolean()
      .optional()
      .default(false)
      .describe(
        'When true, attach investment holdings to each account that tracks them. Default: false.'
      ),
  });

  const getAccounts: RegisteredTool = {
    name: 'get_accounts',
    description: ACCOUNTS_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        includeHoldings: {
          type: 'boolean',
          description: 'When true, attach investment holdings to each account. Default: false.',
        },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = AccountsSchema.parse(args ?? {});
        const client = await clientFactory();
        const accounts = await client.getAccounts();
        if (!parsed.includeHoldings) return okJSON(accounts);

        const enriched: (Account & { holdings: Holding[] })[] = await Promise.all(
          accounts.map(async (a) => ({
            ...a,
            holdings: await client.getAccountHoldings(a.id).catch(() => []),
          }))
        );
        return okJSON(enriched);
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const BalanceHistorySchema = z.object({
    accountId: z.string().min(1).describe('Account UUID — fetch via get_accounts.'),
    startDate: dateStr.describe('Inclusive start date (YYYY-MM-DD).'),
    endDate: dateStr.describe('Inclusive end date (YYYY-MM-DD).'),
  });
  const getBalanceHistory: RegisteredTool = {
    name: 'get_account_balance_history',
    description: BALANCE_HISTORY_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Account UUID — fetch via get_accounts.',
        },
        startDate: {
          type: 'string',
          description: 'Inclusive start date (YYYY-MM-DD).',
        },
        endDate: {
          type: 'string',
          description: 'Inclusive end date (YYYY-MM-DD).',
        },
      },
      required: ['accountId', 'startDate', 'endDate'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = BalanceHistorySchema.parse(args ?? {});
        const client = await clientFactory();
        return okJSON(
          await client.getAccountBalanceHistory(parsed.accountId, parsed.startDate, parsed.endDate)
        );
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  const RefreshSchema = z.object({
    accountIds: z
      .array(z.string().min(1))
      .optional()
      .describe('Optional list of account UUIDs to refresh. Omit to refresh all accounts.'),
  });
  const refreshAccounts: RegisteredTool = {
    name: 'refresh_accounts',
    description: REFRESH_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        accountIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of account UUIDs. Omit to refresh all.',
        },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = RefreshSchema.parse(args ?? {});
        const client = await clientFactory();
        const result = await client.refreshAccounts(parsed.accountIds);
        return okJSON({
          enqueued: result.success,
          accounts: parsed.accountIds ?? 'all',
          errors: result.errors,
        });
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getAccounts, getBalanceHistory, refreshAccounts];
}
