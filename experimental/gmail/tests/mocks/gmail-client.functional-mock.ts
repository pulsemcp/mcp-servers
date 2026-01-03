import { vi } from 'vitest';
import type { IGmailClient } from '../../shared/src/server.js';

export function createMockGmailClient(): IGmailClient {
  const mockEmails = [
    {
      id: 'msg_001',
      threadId: 'thread_001',
      labelIds: ['INBOX', 'UNREAD'],
      snippet: 'Hey, just wanted to check in about the project...',
      historyId: '12345',
      internalDate: String(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'Subject', value: 'Project Update' },
          { name: 'From', value: 'alice@example.com' },
          { name: 'To', value: 'me@example.com' },
          { name: 'Date', value: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
        ],
        body: {
          size: 150,
          data: Buffer.from(
            'Hey, just wanted to check in about the project. How is everything going?'
          ).toString('base64url'),
        },
      },
      sizeEstimate: 1024,
    },
    {
      id: 'msg_002',
      threadId: 'thread_002',
      labelIds: ['INBOX'],
      snippet: 'Meeting reminder for tomorrow at 2pm...',
      historyId: '12346',
      internalDate: String(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      payload: {
        mimeType: 'text/plain',
        headers: [
          { name: 'Subject', value: 'Meeting Reminder' },
          { name: 'From', value: 'calendar@example.com' },
          { name: 'To', value: 'me@example.com' },
          { name: 'Date', value: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
        ],
        body: {
          size: 200,
          data: Buffer.from(
            'Meeting reminder for tomorrow at 2pm. Please confirm your attendance.'
          ).toString('base64url'),
        },
      },
      sizeEstimate: 2048,
    },
  ];

  return {
    listMessages: vi.fn().mockImplementation(async (options) => {
      let filtered = mockEmails;
      if (options?.labelIds && options.labelIds.length > 0) {
        filtered = mockEmails.filter((email) =>
          options.labelIds.some((label: string) => email.labelIds?.includes(label))
        );
      }

      const maxResults = options?.maxResults ?? 10;
      const messages = filtered.slice(0, maxResults).map((e) => ({
        id: e.id,
        threadId: e.threadId,
      }));

      return {
        messages,
        resultSizeEstimate: messages.length,
      };
    }),

    getMessage: vi.fn().mockImplementation(async (messageId: string) => {
      const email = mockEmails.find((e) => e.id === messageId);
      if (!email) {
        throw new Error(`Message not found: ${messageId}`);
      }
      return email;
    }),
  };
}
