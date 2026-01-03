import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import {
  GmailClient,
  ServiceAccountGmailClient,
  type IGmailClient,
  type ServiceAccountCredentials,
} from '../../shared/src/server.js';

/**
 * Manual tests that hit the real Gmail API
 *
 * Prerequisites (choose one):
 *
 * Option 1: Service Account with Domain-Wide Delegation (Recommended)
 *   - GMAIL_SERVICE_ACCOUNT_KEY_FILE: Path to service account JSON key file
 *   - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate
 *
 * Option 2: OAuth2 Access Token
 *   - GMAIL_ACCESS_TOKEN: Valid OAuth2 access token with gmail.readonly scope
 *
 * To set up service account:
 * 1. Create a Google Cloud project and enable Gmail API
 * 2. Create a service account with domain-wide delegation
 * 3. In Google Workspace Admin, grant the service account access to gmail.readonly scope
 * 4. Download the JSON key file
 *
 * To get an access token:
 * 1. Create a Google Cloud project and enable Gmail API
 * 2. Create OAuth2 credentials
 * 3. Use the OAuth2 playground or your app to get an access token
 */

describe('Gmail Client - Manual Tests', () => {
  let client: IGmailClient;
  let authMethod: 'service_account' | 'access_token';

  beforeAll(() => {
    const serviceAccountKeyFile = process.env.GMAIL_SERVICE_ACCOUNT_KEY_FILE;
    const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL;
    const accessToken = process.env.GMAIL_ACCESS_TOKEN;

    if (serviceAccountKeyFile && impersonateEmail) {
      // Use service account authentication
      const keyFileContent = readFileSync(serviceAccountKeyFile, 'utf-8');
      const credentials: ServiceAccountCredentials = JSON.parse(keyFileContent);
      client = new ServiceAccountGmailClient(credentials, impersonateEmail);
      authMethod = 'service_account';
      console.log(`Using service account authentication, impersonating: ${impersonateEmail}`);
    } else if (accessToken) {
      // Use access token authentication
      client = new GmailClient(accessToken);
      authMethod = 'access_token';
      console.log('Using access token authentication');
    } else {
      throw new Error(
        'Gmail authentication not configured. Set either:\n' +
          '  - GMAIL_SERVICE_ACCOUNT_KEY_FILE and GMAIL_IMPERSONATE_EMAIL for service account auth, or\n' +
          '  - GMAIL_ACCESS_TOKEN for OAuth2 access token auth'
      );
    }
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
        console.log(`Found ${result.messages.length} messages in inbox`);
      } else {
        console.log('No messages in inbox');
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
      console.log(`Found ${result.messages.length} messages from the last 24 hours`);
    });

    it('should filter by time horizon (24 hours)', async () => {
      // Test the same query pattern used by list_recent_emails tool
      const hoursAgo = 24;
      const afterTimestamp = Math.floor((Date.now() - hoursAgo * 60 * 60 * 1000) / 1000);
      const result = await client.listMessages({
        q: `after:${afterTimestamp}`,
        maxResults: 20,
      });

      expect(result.messages).toBeDefined();
      expect(Array.isArray(result.messages)).toBe(true);
      console.log(`Found ${result.messages.length} messages from the last ${hoursAgo} hours`);
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

      // Log some message details for verification
      const headers = message.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value;
      const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value;
      console.log(`Message: "${subject}" from ${from}`);
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

    it('should decode email body content', async () => {
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

      // Check that we can access body content
      const payload = message.payload;
      if (payload?.body?.data) {
        // Direct body content
        const bodyText = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
        expect(typeof bodyText).toBe('string');
        console.log(`Body preview: ${bodyText.substring(0, 100)}...`);
      } else if (payload?.parts) {
        // Multipart email - find text/plain part
        const textPart = payload.parts.find((p) => p.mimeType === 'text/plain');
        if (textPart?.body?.data) {
          const bodyText = Buffer.from(textPart.body.data, 'base64url').toString('utf-8');
          expect(typeof bodyText).toBe('string');
          console.log(`Body preview: ${bodyText.substring(0, 100)}...`);
        }
      }
    });
  });

  describe('authentication', () => {
    it('should report authentication method', () => {
      expect(['service_account', 'access_token']).toContain(authMethod);
      console.log(`Authenticated using: ${authMethod}`);
    });
  });
});
