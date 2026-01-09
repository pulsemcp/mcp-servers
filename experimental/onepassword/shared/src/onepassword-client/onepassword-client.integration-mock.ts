import type {
  IOnePasswordClient,
  OnePasswordVault,
  OnePasswordItem,
  OnePasswordItemDetails,
} from '../types.js';

/**
 * Internal item type that includes IDs (for mock storage and lookup)
 */
interface MockItem {
  id: string;
  title: string;
  category: string;
  vault?: { id: string; name: string };
  tags?: string[];
}

interface MockData {
  vaults?: OnePasswordVault[];
  items?: Record<string, MockItem[]>; // keyed by vault ID (internal format with IDs)
  itemDetails?: Record<string, OnePasswordItemDetails>; // keyed by item ID
  [key: string]: unknown;
}

/**
 * Sanitize an internal mock item to the public OnePasswordItem format (no IDs)
 */
function sanitizeMockItem(item: MockItem): OnePasswordItem {
  return {
    title: item.title,
    category: item.category,
    vault: item.vault ? { name: item.vault.name } : undefined,
    tags: item.tags,
    // Intentionally omit: id
  };
}

/**
 * Creates a mock implementation of IOnePasswordClient for integration tests.
 * This mocks the 1Password CLI, NOT the MCP client.
 * The MCP client (TestMCPClient) is real and tests the actual MCP protocol.
 */
export function createIntegrationMockOnePasswordClient(
  mockData: MockData = {}
): IOnePasswordClient & { mockData: MockData } {
  const defaultVaults: OnePasswordVault[] = [
    { id: 'vault-1', name: 'Personal' },
    { id: 'vault-2', name: 'Work' },
  ];

  // Internal mock items (with IDs for storage/lookup, but sanitized before returning)
  const defaultItems: Record<string, MockItem[]> = {
    'vault-1': [
      { id: 'item-1', title: 'Test Login', category: 'LOGIN' },
      { id: 'item-2', title: 'API Key', category: 'SECURE_NOTE', tags: ['api', 'production'] },
    ],
    'vault-2': [{ id: 'item-3', title: 'Work Email', category: 'LOGIN' }],
  };

  const defaultItemDetails: Record<string, OnePasswordItemDetails> = {
    'item-1': {
      id: 'item-1',
      title: 'Test Login',
      category: 'LOGIN',
      vault: { id: 'vault-1', name: 'Personal' },
      fields: [
        { id: 'username', type: 'STRING', label: 'username', value: 'testuser' },
        { id: 'password', type: 'CONCEALED', label: 'password', value: 'testpass123' },
      ],
      urls: [{ href: 'https://example.com', primary: true }],
    },
    'item-2': {
      id: 'item-2',
      title: 'API Key',
      category: 'SECURE_NOTE',
      vault: { id: 'vault-1', name: 'Personal' },
      tags: ['api', 'production'],
      fields: [{ id: 'notesPlain', type: 'STRING', label: 'notesPlain', value: 'sk-abc123xyz' }],
    },
    'item-3': {
      id: 'item-3',
      title: 'Work Email',
      category: 'LOGIN',
      vault: { id: 'vault-2', name: 'Work' },
      fields: [
        { id: 'username', type: 'STRING', label: 'username', value: 'work@example.com' },
        { id: 'password', type: 'CONCEALED', label: 'password', value: 'workpass456' },
      ],
    },
  };

  const vaults = mockData.vaults || defaultVaults;
  const items = mockData.items || defaultItems;
  const itemDetails = mockData.itemDetails || defaultItemDetails;

  let createdItemCounter = 100;

  const client: IOnePasswordClient & { mockData: MockData } = {
    mockData,

    async getVaults(): Promise<OnePasswordVault[]> {
      return vaults;
    },

    async getItem(itemIdOrTitle: string, vaultId?: string): Promise<OnePasswordItemDetails> {
      // First try to find by ID (for internal unlock mechanism)
      let item: OnePasswordItemDetails | undefined = itemDetails[itemIdOrTitle];

      // If not found by ID, try to find by title
      if (!item) {
        const allDetails = Object.values(itemDetails);
        item = allDetails.find((i) => i.title === itemIdOrTitle);
      }

      if (!item) {
        const error = new Error(`Item "${itemIdOrTitle}" not found`) as Error & { name: string };
        error.name = 'OnePasswordNotFoundError';
        throw error;
      }
      if (vaultId && item.vault.id !== vaultId) {
        const error = new Error(
          `Item "${itemIdOrTitle}" not found in vault "${vaultId}"`
        ) as Error & {
          name: string;
        };
        error.name = 'OnePasswordNotFoundError';
        throw error;
      }
      return item;
    },

    async listItems(vaultId: string): Promise<OnePasswordItem[]> {
      const mockItems = items[vaultId] || [];
      // Sanitize items to remove IDs before returning
      return mockItems.map(sanitizeMockItem);
    },

    async listItemsByTag(tag: string, vaultId?: string): Promise<OnePasswordItem[]> {
      let allItems: MockItem[] = [];

      if (vaultId) {
        allItems = items[vaultId] || [];
      } else {
        for (const vault of vaults) {
          allItems = allItems.concat(items[vault.id] || []);
        }
      }

      // Filter by tag then sanitize to remove IDs
      return allItems.filter((item) => item.tags?.includes(tag)).map(sanitizeMockItem);
    },

    async createLogin(
      vaultId: string,
      title: string,
      username: string,
      password: string,
      url?: string,
      tags?: string[]
    ): Promise<OnePasswordItemDetails> {
      const id = `item-${++createdItemCounter}`;
      const vault = vaults.find((v) => v.id === vaultId);
      if (!vault) {
        throw new Error(`Vault "${vaultId}" not found`);
      }

      const newItem: OnePasswordItemDetails = {
        id,
        title,
        category: 'LOGIN',
        vault: { id: vaultId, name: vault.name },
        tags,
        fields: [
          { id: 'username', type: 'STRING', label: 'username', value: username },
          { id: 'password', type: 'CONCEALED', label: 'password', value: password },
        ],
        urls: url ? [{ href: url, primary: true }] : undefined,
      };

      // Store for later retrieval
      itemDetails[id] = newItem;
      if (!items[vaultId]) {
        items[vaultId] = [];
      }
      items[vaultId].push({ id, title, category: 'LOGIN', tags });

      return newItem;
    },

    async createSecureNote(
      vaultId: string,
      title: string,
      content: string,
      tags?: string[]
    ): Promise<OnePasswordItemDetails> {
      const id = `item-${++createdItemCounter}`;
      const vault = vaults.find((v) => v.id === vaultId);
      if (!vault) {
        throw new Error(`Vault "${vaultId}" not found`);
      }

      const newItem: OnePasswordItemDetails = {
        id,
        title,
        category: 'SECURE_NOTE',
        vault: { id: vaultId, name: vault.name },
        tags,
        fields: [{ id: 'notesPlain', type: 'STRING', label: 'notesPlain', value: content }],
      };

      // Store for later retrieval
      itemDetails[id] = newItem;
      if (!items[vaultId]) {
        items[vaultId] = [];
      }
      items[vaultId].push({ id, title, category: 'SECURE_NOTE', tags });

      return newItem;
    },
  };

  return client;
}
