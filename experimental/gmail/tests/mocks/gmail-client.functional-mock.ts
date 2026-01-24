import { vi } from 'vitest';
import type { IGmailClient, Draft } from '../../shared/src/server.js';
import type { Email, EmailListItem } from '../../shared/src/types.js';

interface DraftListItem {
  id: string;
  message: EmailListItem;
}

export function createMockGmailClient(): IGmailClient {
  const mockEmails: Email[] = [
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
          { name: 'Message-ID', value: '<msg001@example.com>' },
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
          { name: 'Message-ID', value: '<msg002@example.com>' },
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

  const mockDrafts: Draft[] = [];
  let draftIdCounter = 1;
  let messageIdCounter = 100;

  return {
    listMessages: vi.fn().mockImplementation(async (options) => {
      let filtered = mockEmails;
      if (options?.labelIds && options.labelIds.length > 0) {
        filtered = mockEmails.filter((email) =>
          options.labelIds.some((label: string) => email.labelIds?.includes(label))
        );
      }

      // Handle query search
      if (options?.q) {
        const query = options.q.toLowerCase();
        filtered = filtered.filter((email) => {
          const subject =
            email.payload?.headers?.find((h) => h.name === 'Subject')?.value?.toLowerCase() || '';
          const from =
            email.payload?.headers?.find((h) => h.name === 'From')?.value?.toLowerCase() || '';
          return (
            subject.includes(query) ||
            from.includes(query) ||
            email.snippet.toLowerCase().includes(query)
          );
        });
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

    modifyMessage: vi.fn().mockImplementation(async (messageId: string, options) => {
      const email = mockEmails.find((e) => e.id === messageId);
      if (!email) {
        throw new Error(`Message not found: ${messageId}`);
      }

      // Apply label changes
      let labels = [...(email.labelIds || [])];

      if (options.removeLabelIds) {
        labels = labels.filter((l) => !options.removeLabelIds.includes(l));
      }

      if (options.addLabelIds) {
        for (const label of options.addLabelIds) {
          if (!labels.includes(label)) {
            labels.push(label);
          }
        }
      }

      // Update the email in the mock array
      email.labelIds = labels;

      return { ...email, labelIds: labels };
    }),

    createDraft: vi.fn().mockImplementation(async (options) => {
      const draft: Draft = {
        id: `draft_${draftIdCounter++}`,
        message: {
          id: `msg_${messageIdCounter++}`,
          threadId: options.threadId || `thread_${messageIdCounter}`,
          labelIds: ['DRAFT'],
          snippet: options.body.substring(0, 100),
          historyId: '12347',
          internalDate: String(Date.now()),
          payload: {
            mimeType: 'text/plain',
            headers: [
              { name: 'Subject', value: options.subject },
              { name: 'From', value: 'me@example.com' },
              { name: 'To', value: options.to },
              { name: 'Date', value: new Date().toISOString() },
            ],
            body: {
              size: options.body.length,
              data: Buffer.from(options.body).toString('base64url'),
            },
          },
        },
      };

      mockDrafts.push(draft);
      return draft;
    }),

    getDraft: vi.fn().mockImplementation(async (draftId: string) => {
      const draft = mockDrafts.find((d) => d.id === draftId);
      if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
      }
      return draft;
    }),

    listDrafts: vi.fn().mockImplementation(async (options) => {
      const maxResults = options?.maxResults ?? 10;
      const drafts: DraftListItem[] = mockDrafts.slice(0, maxResults).map((d) => ({
        id: d.id,
        message: {
          id: d.message.id,
          threadId: d.message.threadId,
        },
      }));

      return {
        drafts,
        resultSizeEstimate: drafts.length,
      };
    }),

    deleteDraft: vi.fn().mockImplementation(async (draftId: string) => {
      const index = mockDrafts.findIndex((d) => d.id === draftId);
      if (index === -1) {
        throw new Error(`Draft not found: ${draftId}`);
      }
      mockDrafts.splice(index, 1);
    }),

    sendMessage: vi.fn().mockImplementation(async (options) => {
      const sentMessage: Email = {
        id: `msg_${messageIdCounter++}`,
        threadId: options.threadId || `thread_${messageIdCounter}`,
        labelIds: ['SENT'],
        snippet: options.body.substring(0, 100),
        historyId: '12348',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: options.subject },
            { name: 'From', value: 'me@example.com' },
            { name: 'To', value: options.to },
            { name: 'Date', value: new Date().toISOString() },
          ],
          body: {
            size: options.body.length,
            data: Buffer.from(options.body).toString('base64url'),
          },
        },
      };

      return sentMessage;
    }),

    sendDraft: vi.fn().mockImplementation(async (draftId: string) => {
      const draft = mockDrafts.find((d) => d.id === draftId);
      if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
      }

      // Remove from drafts
      const index = mockDrafts.findIndex((d) => d.id === draftId);
      mockDrafts.splice(index, 1);

      // Return the message with SENT label
      return {
        ...draft.message,
        labelIds: ['SENT'],
      };
    }),
  };
}
