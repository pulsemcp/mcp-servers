import { vi } from 'vitest';
import type { IOnePasswordClient } from '../../shared/src/types.js';

/**
 * Creates a mock implementation of IOnePasswordClient for functional tests.
 *
 * Note: This mock returns data in the format that the CLIENT layer produces
 * (after CLI call but before tool sanitization). The tool handlers are responsible
 * for further sanitizing responses (removing IDs, etc.) before returning to users.
 *
 * - listItems/listItemsByTag: Return sanitized items (no IDs) - these are already
 *   sanitized by the client layer
 * - getItem/createLogin/createSecureNote: Return full item details (with IDs) - the
 *   tool handlers sanitize these before returning
 */
export function createMockOnePasswordClient(): IOnePasswordClient {
  return {
    getVaults: vi.fn().mockResolvedValue([
      { id: 'vault-1', name: 'Personal' },
      { id: 'vault-2', name: 'Work' },
    ]),

    // getItem returns full details (with IDs) - tool handler sanitizes before returning
    getItem: vi.fn().mockResolvedValue({
      id: 'item-1',
      title: 'Test Login',
      category: 'LOGIN',
      vault: { id: 'vault-1', name: 'Personal' },
      fields: [
        { id: 'username', type: 'STRING', label: 'username', value: 'testuser' },
        { id: 'password', type: 'CONCEALED', label: 'password', value: 'testpass123' },
      ],
    }),

    // listItems returns sanitized items (no IDs) - already sanitized by client layer
    listItems: vi.fn().mockResolvedValue([
      { title: 'Test Login', category: 'LOGIN' },
      { title: 'API Key', category: 'SECURE_NOTE', tags: ['api'] },
    ]),

    // listItemsByTag returns sanitized items (no IDs) - already sanitized by client layer
    listItemsByTag: vi
      .fn()
      .mockResolvedValue([{ title: 'API Key', category: 'SECURE_NOTE', tags: ['api'] }]),

    // createLogin returns full details (with IDs) - tool handler sanitizes before returning
    createLogin: vi.fn().mockResolvedValue({
      id: 'item-new',
      title: 'New Login',
      category: 'LOGIN',
      vault: { id: 'vault-1', name: 'Personal' },
      fields: [
        { id: 'username', type: 'STRING', label: 'username', value: 'newuser' },
        { id: 'password', type: 'CONCEALED', label: 'password', value: 'newpass123' },
      ],
    }),

    // createSecureNote returns full details (with IDs) - tool handler sanitizes before returning
    createSecureNote: vi.fn().mockResolvedValue({
      id: 'item-note',
      title: 'New Note',
      category: 'SECURE_NOTE',
      vault: { id: 'vault-1', name: 'Personal' },
      fields: [{ id: 'notesPlain', type: 'STRING', label: 'notesPlain', value: 'secret content' }],
    }),
  };
}
