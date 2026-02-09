#!/usr/bin/env node
/**
 * Integration test entry point with mock data
 * Used for running integration tests without real Gmail API access
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';
import type { IGmailClient, Draft } from '../shared/server.js';
import type { Email, EmailListItem } from '../shared/types.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// MOCK DATA
// =============================================================================

interface DraftListItem {
  id: string;
  message: EmailListItem;
}

const MOCK_EMAILS: Email[] = [
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
  {
    id: 'msg_003',
    threadId: 'thread_003',
    labelIds: ['INBOX'],
    snippet: 'Please find the invoice attached...',
    historyId: '12347',
    internalDate: String(Date.now() - 1000 * 60 * 60), // 1 hour ago
    payload: {
      mimeType: 'multipart/mixed',
      headers: [
        { name: 'Subject', value: 'Invoice Attached' },
        { name: 'From', value: 'billing@example.com' },
        { name: 'To', value: 'me@example.com' },
        { name: 'Date', value: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
        { name: 'Message-ID', value: '<msg003@example.com>' },
      ],
      parts: [
        {
          partId: '0',
          mimeType: 'text/plain',
          body: {
            size: 40,
            data: Buffer.from('Please find the invoice attached.').toString('base64url'),
          },
        },
        {
          partId: '1',
          mimeType: 'application/pdf',
          filename: 'invoice.pdf',
          body: {
            attachmentId: 'att_001',
            size: 1024,
          },
        },
      ],
    },
    sizeEstimate: 2048,
  },
];

const mockDrafts: Draft[] = [];
let draftIdCounter = 1;
let messageIdCounter = 100;

// =============================================================================
// MOCK CLIENT
// =============================================================================

function createMockClient(): IGmailClient {
  return {
    async listMessages(options) {
      // Filter by label if specified
      let filtered = MOCK_EMAILS;
      if (options?.labelIds && options.labelIds.length > 0) {
        filtered = MOCK_EMAILS.filter((email) =>
          options.labelIds!.some((label) => email.labelIds?.includes(label))
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

      // Apply maxResults
      const maxResults = options?.maxResults ?? 10;
      const messages = filtered.slice(0, maxResults).map((e) => ({
        id: e.id,
        threadId: e.threadId,
      }));

      return {
        messages,
        resultSizeEstimate: messages.length,
      };
    },

    async getMessage(messageId, _options) {
      const email = MOCK_EMAILS.find((e) => e.id === messageId);
      if (!email) {
        throw new Error(`Message not found: ${messageId}`);
      }
      return email;
    },

    async modifyMessage(messageId, options) {
      const email = MOCK_EMAILS.find((e) => e.id === messageId);
      if (!email) {
        throw new Error(`Message not found: ${messageId}`);
      }

      // Apply label changes
      let labels = [...(email.labelIds || [])];

      if (options.removeLabelIds) {
        labels = labels.filter((l) => !options.removeLabelIds!.includes(l));
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
    },

    async createDraft(options) {
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
    },

    async getDraft(draftId) {
      const draft = mockDrafts.find((d) => d.id === draftId);
      if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
      }
      return draft;
    },

    async listDrafts(options) {
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
    },

    async deleteDraft(draftId) {
      const index = mockDrafts.findIndex((d) => d.id === draftId);
      if (index === -1) {
        throw new Error(`Draft not found: ${draftId}`);
      }
      mockDrafts.splice(index, 1);
    },

    async sendMessage(options) {
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
    },

    async getAttachment(_messageId: string, attachmentId: string) {
      const mockData: Record<string, string> = {
        att_001: Buffer.from('Mock PDF content').toString('base64url'),
      };

      const data = mockData[attachmentId];
      if (!data) {
        throw new Error(`Attachment not found: ${attachmentId}`);
      }

      return { data, size: Buffer.from(data, 'base64url').length };
    },

    async sendDraft(draftId) {
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
    },
  };
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Create server with mock client
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Register handlers with mock client factory
  await registerHandlers(server, createMockClient);

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Gmail (Mock)');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
