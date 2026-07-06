import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, errorResult, okJSON, type ToolResult } from './helpers.js';
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

const SET_BALANCE_HISTORY_DESCRIPTION = `Set the recorded daily balance history for a (manual) account. This edits the balance chart / snapshots you see in Monarch — NOT a transaction, and NOT just the single "current balance".

**How Monarch stores this:** balances are per-day snapshots. Monarch has no GraphQL mutation for dated balances; this tool drives Monarch's "Upload Balance History" importer under the hood (upload a date,balance CSV → parse → poll to completion). Writes are a **per-date UPSERT**: every date you specify is set/created; dates you don't specify are left unchanged. Only works on manual accounts (synced accounts get their history from the institution).

Provide the account plus **either** mode:
- **Range mode** — \`startDate\` + \`endDate\` + \`balance\`: sets the SAME balance for every day from start to end (inclusive). Use this to backfill a flat value across a window.
- **Explicit mode** — \`snapshots\`: an array of \`{ date, balance }\` to set specific days to specific values.

Balances are signed (negative for liabilities). Read the result back with \`get_account_balance_history\` to confirm.

Example (range):
\`\`\`json
{ "accountId": "acc_123", "startDate": "2026-05-28", "endDate": "2026-07-06", "balance": 237000 }
\`\`\`

Example response:
\`\`\`json
{ "accountId": "acc_123", "updatedCount": 40, "startDate": "2026-05-28", "endDate": "2026-07-06", "status": "completed" }
\`\`\`

**Use cases:**
- Backfill a manual account's balance to a fixed value across a date range
- Correct specific days' recorded balances
- Seed balance history for a newly created manual account`;

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

  // Parse a YYYY-MM-DD string as a UTC date, rejecting values that pass the
  // format regex but are not real calendar dates. JS's Date silently rolls
  // these forward (e.g. `2026-02-31` → March 3), so a plain `new Date` NaN check
  // is not enough — we round-trip through `toISOString` and require the day to
  // come back unchanged.
  function parseCalendarDate(date: string, label: string): Date {
    const d = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== date) {
      throw new Error(`${label} is not a real calendar date: ${date}`);
    }
    return d;
  }

  // Expand an inclusive [startDate, endDate] range into one YYYY-MM-DD per day.
  // Uses UTC arithmetic so DST never drops or duplicates a day. Bounded by
  // MAX_RANGE_DAYS to keep the generated CSV sane.
  const MAX_RANGE_DAYS = 3660; // ~10 years
  function enumerateDates(startDate: string, endDate: string): string[] {
    const start = parseCalendarDate(startDate, 'startDate');
    const end = parseCalendarDate(endDate, 'endDate');
    if (start.getTime() > end.getTime()) {
      throw new Error('startDate must be on or before endDate.');
    }
    const dates: string[] = [];
    for (let d = start.getTime(); d <= end.getTime(); d += 24 * 60 * 60 * 1000) {
      dates.push(new Date(d).toISOString().slice(0, 10));
      if (dates.length > MAX_RANGE_DAYS) {
        throw new Error(
          `Date range too large (>${MAX_RANGE_DAYS} days). Narrow the range or use explicit snapshots.`
        );
      }
    }
    return dates;
  }

  const SetBalanceHistorySchema = z
    .object({
      accountId: z
        .string()
        .min(1)
        .describe('Account UUID — fetch via get_accounts. Must be manual.'),
      startDate: dateStr.optional().describe('Range mode: inclusive start date (YYYY-MM-DD).'),
      endDate: dateStr.optional().describe('Range mode: inclusive end date (YYYY-MM-DD).'),
      balance: z
        .number()
        .optional()
        .describe(
          'Range mode: the balance to set for every day in the range (signed; negative for liabilities).'
        ),
      snapshots: z
        .array(
          z.object({
            date: dateStr.describe('Snapshot date (YYYY-MM-DD).'),
            balance: z
              .number()
              .describe('Balance on that date (signed; negative for liabilities).'),
          })
        )
        .optional()
        .describe(
          'Explicit mode: specific { date, balance } snapshots to set. Mutually exclusive with the range fields.'
        ),
    })
    .describe(
      'Provide either range mode (startDate + endDate + balance) or explicit mode (snapshots).'
    );

  const setBalanceHistory: RegisteredTool = {
    name: 'set_account_balance_history',
    description: SET_BALANCE_HISTORY_DESCRIPTION,
    groups: ['manage'],
    inputSchema: {
      type: 'object',
      properties: {
        accountId: {
          type: 'string',
          description: 'Account UUID — fetch via get_accounts. Must be manual.',
        },
        startDate: {
          type: 'string',
          description: 'Range mode: inclusive start date (YYYY-MM-DD).',
        },
        endDate: {
          type: 'string',
          description: 'Range mode: inclusive end date (YYYY-MM-DD).',
        },
        balance: {
          type: 'number',
          description: 'Range mode: the balance to set for every day in the range (signed).',
        },
        snapshots: {
          type: 'array',
          description:
            'Explicit mode: specific { date, balance } snapshots. Mutually exclusive with the range fields.',
          items: {
            type: 'object',
            properties: {
              date: {
                type: 'string',
                description: 'Snapshot date (YYYY-MM-DD).',
              },
              balance: {
                type: 'number',
                description: 'Balance on that date (signed).',
              },
            },
            required: ['date', 'balance'],
          },
        },
      },
      required: ['accountId'],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = SetBalanceHistorySchema.parse(args ?? {});
        const hasRange =
          parsed.startDate !== undefined ||
          parsed.endDate !== undefined ||
          parsed.balance !== undefined;
        const hasExplicit = parsed.snapshots !== undefined && parsed.snapshots.length > 0;

        if (hasRange && hasExplicit) {
          return errorResult(
            'Provide EITHER range mode (startDate + endDate + balance) OR explicit snapshots, not both.'
          );
        }

        let snapshots: Array<{ date: string; balance: number }>;
        if (hasRange) {
          if (
            parsed.startDate === undefined ||
            parsed.endDate === undefined ||
            parsed.balance === undefined
          ) {
            return errorResult('Range mode requires all of startDate, endDate, and balance.');
          }
          snapshots = enumerateDates(parsed.startDate, parsed.endDate).map((date) => ({
            date,
            balance: parsed.balance as number,
          }));
        } else if (hasExplicit) {
          const explicit = parsed.snapshots as Array<{
            date: string;
            balance: number;
          }>;
          // Reject non-calendar dates (the zod regex only checks the shape) and
          // duplicate dates — Monarch's importer rejects a file with two rows
          // for the same date, and a duplicate would also make `updatedCount`
          // and the reported bounds misleading.
          const seen = new Set<string>();
          for (const s of explicit) {
            parseCalendarDate(s.date, 'snapshot date');
            if (seen.has(s.date)) {
              return errorResult(
                `Duplicate date in snapshots: ${s.date}. Each date may appear at most once.`
              );
            }
            seen.add(s.date);
          }
          snapshots = explicit;
        } else {
          return errorResult(
            'Nothing to write: provide range mode (startDate + endDate + balance) or explicit snapshots.'
          );
        }

        const client = await clientFactory();
        return okJSON(
          await client.setAccountBalanceHistory({
            accountId: parsed.accountId,
            snapshots,
          })
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

  return [getAccounts, getBalanceHistory, setBalanceHistory, refreshAccounts];
}
