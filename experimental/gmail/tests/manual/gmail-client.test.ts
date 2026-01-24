import { describe, it, expect, beforeAll } from 'vitest';
import {
  ServiceAccountGmailClient,
  type IGmailClient,
  type ServiceAccountCredentials,
} from '../../shared/src/server.js';

/**
 * Manual tests that hit the real Gmail API
 *
 * Prerequisites:
 *   - GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address
 *   - GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)
 *   - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate
 *
 * To set up service account:
 * 1. Create a Google Cloud project and enable Gmail API
 * 2. Create a service account with domain-wide delegation
 * 3. In Google Workspace Admin, grant the service account access to required scopes
 * 4. Download the JSON key file and extract client_email and private_key
 */

describe('Gmail Client - Manual Tests', () => {
  let client: IGmailClient;

  beforeAll(() => {
    const clientEmail = process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL;
    // Handle both literal \n in JSON configs and actual newlines
    const privateKey = process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL;

    if (!clientEmail || !privateKey || !impersonateEmail) {
      throw new Error(
        'Gmail authentication not configured. Set:\n' +
          '  - GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address\n' +
          '  - GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)\n' +
          '  - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate'
      );
    }

    const credentials: ServiceAccountCredentials = {
      type: 'service_account',
      project_id: '',
      private_key_id: '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: '',
    };
    client = new ServiceAccountGmailClient(credentials, impersonateEmail);
    console.log(`Using service account authentication, impersonating: ${impersonateEmail}`);
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

  describe('modifyMessage', () => {
    it('should modify labels on a message', async () => {
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
      const originalMessage = await client.getMessage(messageId, { format: 'metadata' });
      const originalLabels = originalMessage.labelIds || [];

      console.log(`Original labels: ${originalLabels.join(', ')}`);

      // Add STARRED label
      const modifiedMessage = await client.modifyMessage(messageId, {
        addLabelIds: ['STARRED'],
      });

      expect(modifiedMessage.labelIds).toContain('STARRED');
      console.log(`Labels after starring: ${modifiedMessage.labelIds?.join(', ')}`);

      // Remove STARRED label to restore original state
      const restoredMessage = await client.modifyMessage(messageId, {
        removeLabelIds: ['STARRED'],
      });

      expect(restoredMessage.labelIds).not.toContain('STARRED');
      console.log(`Labels after unstarring: ${restoredMessage.labelIds?.join(', ')}`);
    });
  });

  describe('drafts', () => {
    let createdDraftId: string | null = null;

    it('should create a draft', async () => {
      const draft = await client.createDraft({
        to: process.env.GMAIL_IMPERSONATE_EMAIL || 'test@example.com',
        subject: `[TEST] Draft created by manual test - ${new Date().toISOString()}`,
        body: 'This is a test draft created by the Gmail MCP server manual tests.\n\nPlease delete this draft.',
      });

      expect(draft).toHaveProperty('id');
      expect(draft).toHaveProperty('message');
      createdDraftId = draft.id;
      console.log(`Created draft with ID: ${draft.id}`);
    });

    it('should list drafts', async () => {
      const result = await client.listDrafts({ maxResults: 5 });

      expect(result.drafts).toBeDefined();
      expect(Array.isArray(result.drafts)).toBe(true);
      console.log(`Found ${result.drafts.length} drafts`);
    });

    it('should get a draft by ID', async () => {
      if (!createdDraftId) {
        console.warn('No draft created to test with');
        return;
      }

      const draft = await client.getDraft(createdDraftId);

      expect(draft).toHaveProperty('id');
      expect(draft.id).toBe(createdDraftId);
      console.log(`Retrieved draft: ${draft.id}`);
    });

    it('should delete a draft', async () => {
      if (!createdDraftId) {
        console.warn('No draft created to test with');
        return;
      }

      await client.deleteDraft(createdDraftId);
      console.log(`Deleted draft: ${createdDraftId}`);

      // Verify it's deleted by trying to get it
      try {
        await client.getDraft(createdDraftId);
        throw new Error('Draft should have been deleted');
      } catch (error) {
        expect((error as Error).message).toContain('not found');
      }
    });
  });

  describe('sendMessage', () => {
    it('should send a test email (to same account)', async () => {
      const recipientEmail = process.env.GMAIL_IMPERSONATE_EMAIL;
      if (!recipientEmail) {
        console.warn('No impersonate email set, skipping send test');
        return;
      }

      const sentMessage = await client.sendMessage({
        to: recipientEmail,
        subject: `[TEST] Email sent by manual test - ${new Date().toISOString()}`,
        body: 'This is a test email sent by the Gmail MCP server manual tests.\n\nPlease delete this email.',
      });

      expect(sentMessage).toHaveProperty('id');
      expect(sentMessage).toHaveProperty('threadId');
      console.log(`Sent email with ID: ${sentMessage.id}`);
    });
  });

  describe('authentication', () => {
    it('should use service account authentication', () => {
      expect(client).toBeInstanceOf(ServiceAccountGmailClient);
      console.log('Authenticated using: service_account');
    });
  });
});
