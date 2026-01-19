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
import type { IGmailClient } from '../shared/server.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_EMAILS = [
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
