import { describe, it, expect, beforeAll } from 'vitest';
import { GmailClient } from '../../shared/src/server.js';

/**
 * Manual tests that hit the real Gmail API
 *
 * Prerequisites:
 * 1. Set GMAIL_ACCESS_TOKEN environment variable with a valid OAuth2 access token
 * 2. The token must have gmail.readonly scope
 *
 * To get an access token:
 * 1. Create a Google Cloud project and enable Gmail API
 * 2. Create OAuth2 credentials
 * 3. Use the OAuth2 playground or your app to get an access token
 */

describe('Gmail Client - Manual Tests', () => {
  let client: GmailClient;

  beforeAll(() => {
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        'GMAIL_ACCESS_TOKEN environment variable is required for manual tests. ' +
          'See the test file for instructions on obtaining a token.'
      );
    }

    client = new GmailClient(accessToken);
  });

  describe('listMessages', () => {
    it('should list messages from inbox', async () => {
      const result = await client.listMessages({
        labelIds: ['INBOX'],
        maxResults: 5,
      });

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);

      if (result.messages.length > 0) {
        expect(result.messages[0]).toHaveProperty('id');
        expect(result.messages[0]).toHaveProperty('threadId');
      }
    });

    it('should filter by query', async () => {
      // Get messages from the last day
      const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const result = await client.listMessages({
        q: `after:${yesterday}`,
        maxResults: 10,
      });

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
    });
  });

  describe('getMessage', () => {
    it('should get a message with full format', async () => {
      // First, list messages to get an ID
      const listResult = await client.listMessages({
        labelIds: ['INBOX'],
        maxResults: 1,
      });

      if (listResult.messages.length === 0) {
        console.warn('No messages in inbox to test with');
        return;
      }

      const messageId = listResult.messages[0].id;
      const message = await client.getMessage(messageId, { format: 'full' });

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('threadId');
      expect(message).toHaveProperty('payload');
      expect(message.payload).toHaveProperty('headers');
    });

    it('should get a message with metadata format', async () => {
      // First, list messages to get an ID
      const listResult = await client.listMessages({
        labelIds: ['INBOX'],
        maxResults: 1,
      });

      if (listResult.messages.length === 0) {
        console.warn('No messages in inbox to test with');
        return;
      }

      const messageId = listResult.messages[0].id;
      const message = await client.getMessage(messageId, {
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      });

      expect(message).toHaveProperty('id');
      expect(message.payload?.headers).toBeDefined();
    });
  });
});
