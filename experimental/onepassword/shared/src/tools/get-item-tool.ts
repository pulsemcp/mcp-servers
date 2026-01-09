import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import {
  IOnePasswordClient,
  OnePasswordItemDetails,
  OnePasswordField,
  OnePasswordSafeItemDetails,
  OnePasswordSafeField,
} from '../types.js';
import { isItemUnlocked } from '../unlocked-items.js';

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

Retrieves item information including metadata and fields. For security, **sensitive credential fields are redacted by default**.

**To access actual credentials:**
1. First use \`onepassword_unlock_item\` with the item's 1Password URL (copy from the 1Password app)
2. Then call this tool - credentials will be included for unlocked items

**Returns:**
- Item metadata (title, category, vault, tags, timestamps)
- Field names and types
- For UNLOCKED items: actual credential values
- For LOCKED items: field values show "[REDACTED - use unlock_item first]"

**Security Note:** Item IDs are intentionally omitted. To access credentials, use the onepassword_unlock_item tool with a URL copied from the 1Password app.

**Use cases:**
- View item metadata and structure
- Retrieve credentials after unlocking
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
 * Sanitize a field by removing internal IDs
 */
function sanitizeField(field: OnePasswordField): OnePasswordSafeField {
  return {
    type: field.type,
    purpose: field.purpose,
    label: field.label,
    value: field.value,
    // Intentionally omit: id, reference
  };
}

/**
 * Sanitize item details by removing all internal IDs
 * This prevents constructing unlock URLs without explicit user action
 */
function sanitizeItemDetails(item: OnePasswordItemDetails): OnePasswordSafeItemDetails {
  return {
    title: item.title,
    category: item.category,
    vault: {
      name: item.vault.name,
      // Intentionally omit: id
    },
    tags: item.tags,
    fields: item.fields?.map(sanitizeField),
    // Intentionally omit: sections (they contain IDs)
    urls: item.urls,
    created_at: item.created_at,
    updated_at: item.updated_at,
    // Intentionally omit: id
  };
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
          value: '[REDACTED - use unlock_item first]',
        };
      }
      return field;
    });
  }

  return redactedItem;
}

/**
 * Tool for getting item details
 */
export function getItemTool(_server: Server, clientFactory: () => IOnePasswordClient) {
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

        // Check if item is unlocked (using internal ID - not exposed to user)
        const isUnlocked = isItemUnlocked(item.id);

        // Sanitize item to remove all IDs before responding
        const sanitizedItem = sanitizeItemDetails(item);

        // Redact sensitive fields if not unlocked
        const responseItem = isUnlocked ? sanitizedItem : redactSensitiveFields(sanitizedItem);

        // Add unlock status to the response
        const response = {
          ...responseItem,
          _unlocked: isUnlocked,
          _note: isUnlocked
            ? 'Full credentials included (item is unlocked)'
            : 'Sensitive fields redacted. Use onepassword_unlock_item with the item URL to access credentials.',
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
