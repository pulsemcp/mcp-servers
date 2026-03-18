import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { requestConfirmation, createConfirmationSchema } from '@pulsemcp/mcp-elicitation';
import {
  IOnePasswordClient,
  OnePasswordField,
  OnePasswordSafeItemDetails,
  OnePasswordSafeField,
} from '../types.js';
import { sanitizeItemDetails } from './sanitize.js';
import {
  readOnePasswordElicitationConfig,
  isItemWhitelisted,
  type OnePasswordElicitationConfig,
} from '../elicitation-config.js';

const PARAM_DESCRIPTIONS = {
  itemId: 'The title of the item to retrieve. Get item titles from onepassword_list_items.',
  vaultId:
    'Optional vault ID to narrow the search. Recommended for precision when titles may overlap.',
} as const;

export const GetItemSchema = z.object({
  itemId: z.string().min(1).describe(PARAM_DESCRIPTIONS.itemId),
  vaultId: z.string().optional().describe(PARAM_DESCRIPTIONS.vaultId),
});

const TOOL_DESCRIPTION = `Get the details of a specific 1Password item.

Retrieves item information including metadata and fields. For security, **sensitive credential fields require approval before being revealed**.

**Approval behavior (configurable via environment variables):**
- If elicitation is enabled (default), you will be asked to confirm before credentials are shown
- Whitelisted items (via OP_WHITELISTED_ITEMS) bypass the confirmation prompt
- If elicitation is disabled, credentials are returned directly

**Returns:**
- Item metadata (title, category, vault, tags, timestamps)
- Field names and types
- For APPROVED items: actual credential values
- For DENIED items: field values show "[REDACTED]"

**Security Note:** Item IDs are intentionally omitted from the response.

**Use cases:**
- View item metadata and structure
- Retrieve credentials after approval
- Discover what fields an item contains`;

// Field types that contain sensitive data and should be redacted
const SENSITIVE_FIELD_TYPES = new Set([
  'CONCEALED',
  'PASSWORD',
  'SECRET',
  'CREDIT_CARD_NUMBER',
  'CREDIT_CARD_CVV',
]);

// Field IDs/labels that typically contain sensitive data
const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /credential/i,
  /cvv/i,
  /pin/i,
];

/**
 * Check if a field contains sensitive data that should be redacted
 */
function isSensitiveField(field: OnePasswordField | OnePasswordSafeField): boolean {
  // Check by type
  if (field.type && SENSITIVE_FIELD_TYPES.has(field.type)) {
    return true;
  }

  // Check by field label patterns (id may not be present in safe fields)
  const fieldIdentifier = (('id' in field ? field.id : '') || field.label || '').toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(fieldIdentifier));
}

/**
 * Redact sensitive fields from an item
 */
function redactSensitiveFields(item: OnePasswordSafeItemDetails): OnePasswordSafeItemDetails {
  const redactedItem = { ...item };

  if (redactedItem.fields) {
    redactedItem.fields = redactedItem.fields.map((field) => {
      if (isSensitiveField(field) && field.value) {
        return {
          ...field,
          value: '[REDACTED]',
        };
      }
      return field;
    });
  }

  return redactedItem;
}

/**
 * Determine whether to show credentials for this item based on elicitation config.
 * Returns true if credentials should be revealed, false if they should be redacted.
 */
async function shouldRevealCredentials(
  server: Server,
  itemTitle: string,
  elicitConfig: OnePasswordElicitationConfig
): Promise<{ reveal: boolean }> {
  // If read elicitation is disabled, allow by default
  if (!elicitConfig.readElicitationEnabled) {
    return { reveal: true };
  }

  // Check whitelist - bypass elicitation for pre-approved items
  if (isItemWhitelisted(elicitConfig, itemTitle)) {
    return { reveal: true };
  }

  // Request confirmation via elicitation
  const confirmation = await requestConfirmation(
    {
      server,
      message:
        `1Password credential access requested:\n` +
        `  Item: ${itemTitle}\n\n` +
        `Approve to reveal sensitive fields (passwords, secrets, tokens, etc.).`,
      requestedSchema: createConfirmationSchema(
        'Reveal credentials?',
        `Allow access to sensitive fields in "${itemTitle}".`
      ),
      meta: {
        'com.pulsemcp/tool-name': 'onepassword_get_item',
      },
    },
    elicitConfig.base
  );

  // Fail-safe: only proceed on explicit 'accept'
  if (confirmation.action !== 'accept') {
    return { reveal: false };
  }

  // Defense-in-depth: some MCP clients may return action='accept' without the
  // user explicitly checking the confirmation checkbox. Guard against this edge case.
  if (
    confirmation.content &&
    'confirm' in confirmation.content &&
    confirmation.content.confirm === false
  ) {
    return { reveal: false };
  }

  return { reveal: true };
}

/**
 * Tool for getting item details
 */
export function getItemTool(server: Server, clientFactory: () => IOnePasswordClient) {
  return {
    name: 'onepassword_get_item',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        itemId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.itemId,
        },
        vaultId: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.vaultId,
        },
      },
      required: ['itemId'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetItemSchema.parse(args);
        const client = clientFactory();
        const item = await client.getItem(validatedArgs.itemId, validatedArgs.vaultId);

        // Sanitize item to remove all IDs before responding
        const sanitizedItem = sanitizeItemDetails(item);

        // Check if item has any sensitive fields worth gating
        const hasSensitiveFields = sanitizedItem.fields?.some(
          (f) => isSensitiveField(f) && f.value
        );

        let credentialsRevealed = true;

        if (hasSensitiveFields) {
          const elicitConfig = readOnePasswordElicitationConfig();
          const { reveal } = await shouldRevealCredentials(server, item.title, elicitConfig);
          credentialsRevealed = reveal;
        }

        // Redact sensitive fields if not approved
        const responseItem = credentialsRevealed
          ? sanitizedItem
          : redactSensitiveFields(sanitizedItem);

        const response = {
          ...responseItem,
          _credentialsRevealed: credentialsRevealed,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting item: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
