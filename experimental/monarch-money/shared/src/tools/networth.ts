import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { errorFromException, okJSON, type ToolResult } from './helpers.js';
import type { RegisteredTool } from '../tools.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const dateStr = z.string().regex(dateRegex, 'Date must be in YYYY-MM-DD format.');

const NET_WORTH_DESCRIPTION = `Net worth view, returned in two flavors:

- Default (\`view: "history"\`): time series of net worth (and assets/liabilities) over a date range. Omit both dates to fetch the full history Monarch has on file.
- \`view: "by_type"\`: current net worth grouped by account type (e.g., depository, brokerage, credit, loan), synthesized client-side from \`get_accounts\`. Use for "how is my net worth distributed?" style questions. Date params are ignored in this view.

Example response (\`view: "history"\`):
\`\`\`json
[
  { "date": "2026-01-01", "netWorth": 124300, "assets": 162400, "liabilities": -38100 },
  { "date": "2026-01-02", "netWorth": 124910, "assets": 163100, "liabilities": -38190 }
]
\`\`\`

Example response (\`view: "by_type"\`):
\`\`\`json
[
  { "type": "Brokerage",   "balance": 84210.55 },
  { "type": "Checking",    "balance": 4321.55 },
  { "type": "Credit Card", "balance": -1245.10 }
]
\`\`\`

**View enum:**
- \`history\` (default): time series across the full date range
- \`by_type\`: grouped current snapshot by account type

**Use cases:**
- Plot a net worth chart over the last year
- Show "what is my net worth made of?" using \`view: "by_type"\`
- Pull a specific window (\`startDate\`/\`endDate\`) for a quarterly review
- Compare assets vs. liabilities at the start and end of a period`;

export function netWorthTools(clientFactory: ClientFactory): RegisteredTool[] {
  const NetWorthSchema = z.object({
    view: z
      .enum(['history', 'by_type'])
      .optional()
      .default('history')
      .describe(
        "Which net-worth view to return. 'history' = time series; 'by_type' = current breakdown by account type. Default: history."
      ),
    startDate: dateStr
      .optional()
      .describe('Optional inclusive start date (YYYY-MM-DD). Only used by view: history.'),
    endDate: dateStr
      .optional()
      .describe('Optional inclusive end date (YYYY-MM-DD). Only used by view: history.'),
  });
  const getNetWorth: RegisteredTool = {
    name: 'get_net_worth',
    description: NET_WORTH_DESCRIPTION,
    groups: ['readonly', 'manage'],
    inputSchema: {
      type: 'object',
      properties: {
        view: {
          type: 'string',
          enum: ['history', 'by_type'],
          description: 'Which net-worth view to return. Default: history (time series).',
        },
        startDate: {
          type: 'string',
          description: 'Inclusive start date (YYYY-MM-DD). Only used by view: history.',
        },
        endDate: {
          type: 'string',
          description: 'Inclusive end date (YYYY-MM-DD). Only used by view: history.',
        },
      },
      required: [],
    },
    handler: async (args): Promise<ToolResult> => {
      try {
        const parsed = NetWorthSchema.parse(args ?? {});
        const client = await clientFactory();
        if (parsed.view === 'by_type') {
          return okJSON(await client.getNetWorthByAccountType());
        }
        return okJSON(await client.getNetWorth(parsed.startDate, parsed.endDate));
      } catch (err) {
        return errorFromException(err);
      }
    },
  };

  return [getNetWorth];
}
