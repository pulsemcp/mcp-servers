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
    "setHideFromReportsAction": false,
    "lastAppliedAt": "2026-04-12T18:22:01Z"
  }
]
\`\`\`

**Use cases:**
- Audit existing auto-categorization rules
- Inspect a rule's match criteria and last-run time

Note: rule create/update/delete are not exposed by this server. Manage rules from the Monarch UI.`;

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

  return [getRules];
}
