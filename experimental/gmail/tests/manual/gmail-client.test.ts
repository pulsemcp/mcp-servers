import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit the real Gmail API via the MCP server.
 *
 * Prerequisites (choose one):
 *
 * Option 1: OAuth2 (for personal Gmail accounts)
 *   - GMAIL_OAUTH_CLIENT_ID: OAuth2 client ID from Google Cloud Console
 *   - GMAIL_OAUTH_CLIENT_SECRET: OAuth2 client secret
 *   - GMAIL_OAUTH_REFRESH_TOKEN: Refresh token from oauth-setup.ts script
 *
 * Option 2: Service Account (for Google Workspace)
 *   - GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address
 *   - GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)
 *   - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate
 *
 * Run with: npm run test:manual
 */
describe('Gmail Client - Manual Tests', () => {
  let client: TestMCPClient;
  let testRecipientEmail: string;

  beforeAll(async () => {
    const hasOAuth2 =
      process.env.GMAIL_OAUTH_CLIENT_ID &&
      process.env.GMAIL_OAUTH_CLIENT_SECRET &&
      process.env.GMAIL_OAUTH_REFRESH_TOKEN;

    const hasServiceAccount =
      process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL &&
      process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GMAIL_IMPERSONATE_EMAIL;

    if (!hasOAuth2 && !hasServiceAccount) {
      throw new Error(
        'Gmail authentication not configured. Set one of:\n\n' +
          'Option 1 - OAuth2 (for personal Gmail):\n' +
          '  - GMAIL_OAUTH_CLIENT_ID\n' +
          '  - GMAIL_OAUTH_CLIENT_SECRET\n' +
          '  - GMAIL_OAUTH_REFRESH_TOKEN\n\n' +
          'Option 2 - Service Account (for Google Workspace):\n' +
          '  - GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL\n' +
          '  - GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY\n' +
          '  - GMAIL_IMPERSONATE_EMAIL'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    const env: Record<string, string> = {};

    if (hasOAuth2) {
      env.GMAIL_OAUTH_CLIENT_ID = process.env.GMAIL_OAUTH_CLIENT_ID!;
      env.GMAIL_OAUTH_CLIENT_SECRET = process.env.GMAIL_OAUTH_CLIENT_SECRET!;
      env.GMAIL_OAUTH_REFRESH_TOKEN = process.env.GMAIL_OAUTH_REFRESH_TOKEN!;
      testRecipientEmail = process.env.GMAIL_TEST_RECIPIENT_EMAIL || '';
      console.log('Using OAuth2 authentication (personal Gmail account)');
    } else {
      env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL!;
      env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY!;
      env.GMAIL_IMPERSONATE_EMAIL = process.env.GMAIL_IMPERSONATE_EMAIL!;
      testRecipientEmail = process.env.GMAIL_IMPERSONATE_EMAIL!;
      console.log(
        `Using service account authentication, impersonating: ${process.env.GMAIL_IMPERSONATE_EMAIL}`
      );
    }

    client = new TestMCPClient({
      serverPath,
      env,
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('list_email_conversations', () => {
    it('should list conversations from inbox', async () => {
      const result = await client.callTool('list_email_conversations', {
        label: 'INBOX',
        max_results: 5,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`list_email_conversations response length: ${text.length} chars`);
    });

    it('should filter by query', async () => {
      const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
      const result = await client.callTool('list_email_conversations', {
        query: `after:${yesterday}`,
        max_results: 10,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`Found conversations from the last 24 hours, response length: ${text.length}`);
    });
  });

  describe('search_email_conversations', () => {
    it('should search for conversations', async () => {
      const result = await client.callTool('search_email_conversations', {
        query: 'has:attachment',
        max_results: 5,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`search_email_conversations response length: ${text.length} chars`);
    });
  });

  describe('get_email_conversation', () => {
    it('should get a conversation with full details', async () => {
      // First, list conversations to get an ID
      const listResult = await client.callTool('list_email_conversations', {
        label: 'INBOX',
        max_results: 1,
      });
      expect(listResult.isError).toBeFalsy();

      const listText = (listResult.content[0] as { text: string }).text;

      // Extract an email ID from the response (format: **ID:** xxx)
      const idMatch = listText.match(/\*\*ID:\*\*\s*(\S+)/);
      if (!idMatch) {
        console.log('No conversations available to test with');
        return;
      }

      const emailId = idMatch[1];
      const result = await client.callTool('get_email_conversation', {
        email_id: emailId,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`Retrieved conversation: ${emailId}`);
    });
  });

  describe('change_email_conversation', () => {
    it('should modify labels on a conversation', async () => {
      // First, list conversations to get an ID
      const listResult = await client.callTool('list_email_conversations', {
        label: 'INBOX',
        max_results: 1,
      });
      expect(listResult.isError).toBeFalsy();

      const listText = (listResult.content[0] as { text: string }).text;
      const idMatch = listText.match(/\*\*ID:\*\*\s*(\S+)/);
      if (!idMatch) {
        console.log('No conversations available to test with');
        return;
      }

      const emailId = idMatch[1];

      // Star the email
      const starResult = await client.callTool('change_email_conversation', {
        email_id: emailId,
        is_starred: true,
      });
      expect(starResult.isError).toBeFalsy();
      console.log(`Starred email: ${emailId}`);

      // Unstar the email to restore original state
      const unstarResult = await client.callTool('change_email_conversation', {
        email_id: emailId,
        is_starred: false,
      });
      expect(unstarResult.isError).toBeFalsy();
      console.log(`Unstarred email: ${emailId}`);
    });
  });

  describe('draft_email', () => {
    it('should create a draft', async () => {
      const recipient =
        testRecipientEmail || process.env.GMAIL_IMPERSONATE_EMAIL || 'test@example.com';

      const result = await client.callTool('draft_email', {
        to: recipient,
        subject: `[TEST] Draft created by manual test - ${new Date().toISOString()}`,
        body: 'This is a test draft created by the Gmail MCP server manual tests.\n\nPlease delete this draft.',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`Created draft, response length: ${text.length} chars`);
    });
  });

  describe('send_email', () => {
    it('should send a test email', async () => {
      if (!testRecipientEmail && !process.env.GMAIL_IMPERSONATE_EMAIL) {
        console.log('Skipping send test - no recipient email available');
        return;
      }

      const recipientEmail = testRecipientEmail || process.env.GMAIL_IMPERSONATE_EMAIL!;

      const result = await client.callTool('send_email', {
        to: recipientEmail,
        subject: `[TEST] Email sent by manual test - ${new Date().toISOString()}`,
        body: 'This is a test email sent by the Gmail MCP server manual tests.\n\nPlease delete this email.',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`Sent email, response length: ${text.length} chars`);
    });
  });

  describe('download_email_attachments', () => {
    it('should download attachments from an email with attachments', async () => {
      // Search for emails with attachments
      const searchResult = await client.callTool('search_email_conversations', {
        query: 'has:attachment',
        max_results: 5,
      });
      expect(searchResult.isError).toBeFalsy();

      const searchText = (searchResult.content[0] as { text: string }).text;

      // Extract an email ID from the response (format: **ID:** xxx)
      const idMatch = searchText.match(/\*\*ID:\*\*\s*(\S+)/);
      if (!idMatch) {
        console.log('No emails with attachments found');
        return;
      }

      const emailId = idMatch[1];
      const result = await client.callTool('download_email_attachments', {
        email_id: emailId,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`download_email_attachments response length: ${text.length} chars`);
    });
  });
});
