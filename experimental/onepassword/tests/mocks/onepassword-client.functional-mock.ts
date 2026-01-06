import { vi } from 'vitest';
import type { IOnePasswordClient } from '../../shared/src/types.js';

export function createMockOnePasswordClient(): IOnePasswordClient {
  return {
    getVaults: vi.fn().mockResolvedValue([
      { id: 'vault-1', name: 'Personal' },
      { id: 'vault-2', name: 'Work' },
    ]),

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

    listItems: vi.fn().mockResolvedValue([
      { id: 'item-1', title: 'Test Login', category: 'LOGIN' },
      { id: 'item-2', title: 'API Key', category: 'SECURE_NOTE', tags: ['api'] },
    ]),

    listItemsByTag: vi
      .fn()
      .mockResolvedValue([
        { id: 'item-2', title: 'API Key', category: 'SECURE_NOTE', tags: ['api'] },
      ]),

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

    createSecureNote: vi.fn().mockResolvedValue({
      id: 'item-note',
      title: 'New Note',
      category: 'SECURE_NOTE',
      vault: { id: 'vault-1', name: 'Personal' },
      fields: [{ id: 'notesPlain', type: 'STRING', label: 'notesPlain', value: 'secret content' }],
    }),
  };
}
