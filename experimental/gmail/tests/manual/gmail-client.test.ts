import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import type { ElicitationHandler } from '../../../../libs/test-mcp-client/build/index.js';
import http from 'node:http';
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

    // Disable elicitation for standard tests (tested separately below)
    env.ELICITATION_ENABLED = 'false';

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

  describe('upsert_draft_email', () => {
    it('should create a draft', async () => {
      const recipient =
        testRecipientEmail || process.env.GMAIL_IMPERSONATE_EMAIL || 'test@example.com';

      const result = await client.callTool('upsert_draft_email', {
        to: recipient,
        subject: `[TEST] Draft created by manual test - ${new Date().toISOString()}`,
        plaintext_body:
          'This is a test draft created by the Gmail MCP server manual tests.\n\nPlease delete this draft.',
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
        plaintext_body:
          'This is a test email sent by the Gmail MCP server manual tests.\n\nPlease delete this email.',
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

/**
 * Elicitation tests - verifies that the elicitation flow works with real Gmail API.
 *
 * These tests use a separate TestMCPClient instance with elicitation enabled
 * and a client-side handler that auto-accepts or auto-declines.
 */
describe('Gmail Client - Elicitation Manual Tests', () => {
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  function getGmailEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    const hasOAuth2 =
      process.env.GMAIL_OAUTH_CLIENT_ID &&
      process.env.GMAIL_OAUTH_CLIENT_SECRET &&
      process.env.GMAIL_OAUTH_REFRESH_TOKEN;

    if (hasOAuth2) {
      env.GMAIL_OAUTH_CLIENT_ID = process.env.GMAIL_OAUTH_CLIENT_ID!;
      env.GMAIL_OAUTH_CLIENT_SECRET = process.env.GMAIL_OAUTH_CLIENT_SECRET!;
      env.GMAIL_OAUTH_REFRESH_TOKEN = process.env.GMAIL_OAUTH_REFRESH_TOKEN!;
    } else {
      env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL!;
      env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY!;
      env.GMAIL_IMPERSONATE_EMAIL = process.env.GMAIL_IMPERSONATE_EMAIL!;
    }
    return env;
  }

  describe('send_email with elicitation enabled (user accepts)', () => {
    let elicitClient: TestMCPClient;

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
        throw new Error('Gmail authentication not configured for elicitation tests.');
      }

      const env = getGmailEnv();
      env.ELICITATION_ENABLED = 'true';

      const elicitationHandler: ElicitationHandler = async ({ message }) => {
        console.log(`[Elicitation] Received confirmation request: ${message.substring(0, 100)}...`);
        return { action: 'accept', content: { confirm: true } };
      };

      elicitClient = new TestMCPClient({
        serverPath,
        env,
        elicitationHandler,
      });

      await elicitClient.connect();
    });

    afterAll(async () => {
      if (elicitClient) {
        await elicitClient.disconnect();
      }
    });

    it('should send email after user accepts elicitation', async () => {
      const recipientEmail =
        process.env.GMAIL_TEST_RECIPIENT_EMAIL || process.env.GMAIL_IMPERSONATE_EMAIL;
      if (!recipientEmail) {
        console.log('Skipping - no recipient email available');
        return;
      }

      const result = await elicitClient.callTool('send_email', {
        to: recipientEmail,
        subject: `[TEST-ELICIT] Accepted send - ${new Date().toISOString()}`,
        plaintext_body:
          'This email was sent after accepting an elicitation prompt.\n\nPlease delete this email.',
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Email sent successfully');
      console.log(`Elicitation accept test passed. Email sent successfully.`);
    });
  });

  describe('send_email with elicitation enabled (user declines)', () => {
    let elicitClient: TestMCPClient;

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
        throw new Error('Gmail authentication not configured for elicitation tests.');
      }

      const env = getGmailEnv();
      env.ELICITATION_ENABLED = 'true';

      const elicitationHandler: ElicitationHandler = async ({ message }) => {
        console.log(`[Elicitation] Declining: ${message.substring(0, 100)}...`);
        return { action: 'decline' };
      };

      elicitClient = new TestMCPClient({
        serverPath,
        env,
        elicitationHandler,
      });

      await elicitClient.connect();
    });

    afterAll(async () => {
      if (elicitClient) {
        await elicitClient.disconnect();
      }
    });

    it('should not send email when user declines elicitation', async () => {
      const recipientEmail =
        process.env.GMAIL_TEST_RECIPIENT_EMAIL || process.env.GMAIL_IMPERSONATE_EMAIL;
      if (!recipientEmail) {
        console.log('Skipping - no recipient email available');
        return;
      }

      const result = await elicitClient.callTool('send_email', {
        to: recipientEmail,
        subject: `[TEST-ELICIT] Should NOT be sent - ${new Date().toISOString()}`,
        plaintext_body: 'This email should NOT have been sent - the user declined.',
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('cancelled by the user');
      console.log(`Elicitation decline test passed. Email was NOT sent.`);
    });
  });

  describe('send_email with elicitation disabled', () => {
    let elicitClient: TestMCPClient;

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
        throw new Error('Gmail authentication not configured for elicitation tests.');
      }

      const env = getGmailEnv();
      env.ELICITATION_ENABLED = 'false';

      // No elicitation handler - shouldn't be needed when disabled
      elicitClient = new TestMCPClient({
        serverPath,
        env,
      });

      await elicitClient.connect();
    });

    afterAll(async () => {
      if (elicitClient) {
        await elicitClient.disconnect();
      }
    });

    it('should send email without elicitation prompt when disabled', async () => {
      const recipientEmail =
        process.env.GMAIL_TEST_RECIPIENT_EMAIL || process.env.GMAIL_IMPERSONATE_EMAIL;
      if (!recipientEmail) {
        console.log('Skipping - no recipient email available');
        return;
      }

      const result = await elicitClient.callTool('send_email', {
        to: recipientEmail,
        subject: `[TEST-ELICIT-OFF] No prompt - ${new Date().toISOString()}`,
        plaintext_body:
          'This email was sent without any elicitation prompt.\n\nPlease delete this email.',
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Email sent successfully');
      console.log(`Elicitation disabled test passed. Email sent without prompt.`);
    });
  });
});

/**
 * HTTP Fallback Elicitation Tests
 *
 * These tests verify the Tier 3 HTTP fallback path by:
 * 1. Spinning up a local HTTP server that acts as POST + poll endpoints
 * 2. Creating a TestMCPClient WITHOUT an elicitationHandler (so native elicitation is unavailable)
 * 3. Setting ELICITATION_REQUEST_URL and ELICITATION_POLL_URL to the local server
 * 4. Verifying the elicitation library falls through to the HTTP fallback path
 */
describe('Gmail Client - HTTP Fallback Elicitation Tests', () => {
  const serverPath = path.join(__dirname, '../../local/build/index.js');

  function getGmailEnv(): Record<string, string> {
    const env: Record<string, string> = {};
    const hasOAuth2 =
      process.env.GMAIL_OAUTH_CLIENT_ID &&
      process.env.GMAIL_OAUTH_CLIENT_SECRET &&
      process.env.GMAIL_OAUTH_REFRESH_TOKEN;

    if (hasOAuth2) {
      env.GMAIL_OAUTH_CLIENT_ID = process.env.GMAIL_OAUTH_CLIENT_ID!;
      env.GMAIL_OAUTH_CLIENT_SECRET = process.env.GMAIL_OAUTH_CLIENT_SECRET!;
      env.GMAIL_OAUTH_REFRESH_TOKEN = process.env.GMAIL_OAUTH_REFRESH_TOKEN!;
    } else {
      env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL = process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL!;
      env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY!;
      env.GMAIL_IMPERSONATE_EMAIL = process.env.GMAIL_IMPERSONATE_EMAIL!;
    }
    return env;
  }

  /**
   * Creates a local HTTP server that simulates the elicitation approval service.
   * - POST / : Receives elicitation request, stores it, returns { requestId }
   * - GET /:requestId : Returns the configured action (accept/decline)
   */
  function createMockElicitationServer(action: 'accept' | 'decline'): {
    server: http.Server;
    start: () => Promise<number>;
    stop: () => Promise<void>;
    getLastPost: () => { body: unknown; requestId: string } | null;
  } {
    let lastPost: { body: unknown; requestId: string } | null = null;

    const httpServer = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/') {
        let body = '';
        req.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        req.on('end', () => {
          const parsed = JSON.parse(body);
          const requestId = parsed._meta?.['com.pulsemcp/request-id'] || 'fallback-id';
          lastPost = { body: parsed, requestId };
          console.log(`[Mock Server] POST received. Request ID: ${requestId}`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ requestId }));
        });
      } else if (req.method === 'GET' && req.url?.startsWith('/')) {
        const requestId = req.url.slice(1);
        console.log(`[Mock Server] GET poll for ${requestId}, responding with: ${action}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const response: Record<string, unknown> = { action };
        if (action === 'accept') {
          response.content = { confirm: true };
        }
        res.end(JSON.stringify(response));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    return {
      server: httpServer,
      start: () =>
        new Promise<number>((resolve) => {
          httpServer.listen(0, '127.0.0.1', () => {
            const addr = httpServer.address();
            const port = typeof addr === 'object' && addr ? addr.port : 0;
            console.log(`[Mock Server] Listening on port ${port}`);
            resolve(port);
          });
        }),
      stop: () =>
        new Promise<void>((resolve) => {
          httpServer.close(() => resolve());
        }),
      getLastPost: () => lastPost,
    };
  }

  describe('HTTP fallback: user accepts', () => {
    let elicitClient: TestMCPClient;
    let mockServer: ReturnType<typeof createMockElicitationServer>;

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
        throw new Error('Gmail authentication not configured for HTTP fallback tests.');
      }

      // Start mock elicitation server that auto-accepts
      mockServer = createMockElicitationServer('accept');
      const port = await mockServer.start();

      const env = getGmailEnv();
      env.ELICITATION_ENABLED = 'true';
      env.ELICITATION_REQUEST_URL = `http://127.0.0.1:${port}/`;
      env.ELICITATION_POLL_URL = `http://127.0.0.1:${port}/`;

      // NO elicitationHandler — forces fallback to HTTP
      elicitClient = new TestMCPClient({
        serverPath,
        env,
      });

      await elicitClient.connect();
    });

    afterAll(async () => {
      if (elicitClient) await elicitClient.disconnect();
      if (mockServer) await mockServer.stop();
    });

    it('should send email via HTTP fallback when user accepts', async () => {
      const recipientEmail =
        process.env.GMAIL_TEST_RECIPIENT_EMAIL || process.env.GMAIL_IMPERSONATE_EMAIL;
      if (!recipientEmail) {
        console.log('Skipping - no recipient email available');
        return;
      }

      const result = await elicitClient.callTool('send_email', {
        to: recipientEmail,
        subject: `[TEST-HTTP-FALLBACK] Accepted - ${new Date().toISOString()}`,
        plaintext_body:
          'This email was sent via HTTP fallback elicitation (accept).\n\nPlease delete this email.',
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Email sent successfully');

      // Verify the mock server received the POST request
      const lastPost = mockServer.getLastPost();
      expect(lastPost).not.toBeNull();
      expect(lastPost!.body).toHaveProperty('message');
      expect(lastPost!.body).toHaveProperty('requestedSchema');
      console.log(
        `HTTP fallback accept test passed. Email sent via HTTP fallback. Request ID: ${lastPost!.requestId}`
      );
    });
  });

  describe('HTTP fallback: user declines', () => {
    let elicitClient: TestMCPClient;
    let mockServer: ReturnType<typeof createMockElicitationServer>;

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
        throw new Error('Gmail authentication not configured for HTTP fallback tests.');
      }

      // Start mock elicitation server that auto-declines
      mockServer = createMockElicitationServer('decline');
      const port = await mockServer.start();

      const env = getGmailEnv();
      env.ELICITATION_ENABLED = 'true';
      env.ELICITATION_REQUEST_URL = `http://127.0.0.1:${port}/`;
      env.ELICITATION_POLL_URL = `http://127.0.0.1:${port}/`;

      // NO elicitationHandler — forces fallback to HTTP
      elicitClient = new TestMCPClient({
        serverPath,
        env,
      });

      await elicitClient.connect();
    });

    afterAll(async () => {
      if (elicitClient) await elicitClient.disconnect();
      if (mockServer) await mockServer.stop();
    });

    it('should not send email via HTTP fallback when user declines', async () => {
      const recipientEmail =
        process.env.GMAIL_TEST_RECIPIENT_EMAIL || process.env.GMAIL_IMPERSONATE_EMAIL;
      if (!recipientEmail) {
        console.log('Skipping - no recipient email available');
        return;
      }

      const result = await elicitClient.callTool('send_email', {
        to: recipientEmail,
        subject: `[TEST-HTTP-FALLBACK] Should NOT send - ${new Date().toISOString()}`,
        plaintext_body: 'This email should NOT have been sent - user declined via HTTP fallback.',
      });

      expect(result.isError).toBeFalsy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('cancelled by the user');

      // Verify the mock server received the POST request
      const lastPost = mockServer.getLastPost();
      expect(lastPost).not.toBeNull();
      console.log(
        `HTTP fallback decline test passed. Email was NOT sent. Request ID: ${lastPost!.requestId}`
      );
    });
  });
});
