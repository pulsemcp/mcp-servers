import { describe, it, expect, beforeAll } from 'vitest';
import {
  createDefaultClient,
  ServiceAccountGmailClient,
  OAuth2GmailClient,
  type IGmailClient,
} from '../../shared/src/server.js';

/**
 * Manual tests that hit the real Gmail API
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
 */

describe('Gmail Client - Manual Tests', () => {
  let client: IGmailClient;
  let testRecipientEmail: string;

  beforeAll(() => {
    // Check for OAuth2 credentials
    const hasOAuth2 =
      process.env.GMAIL_OAUTH_CLIENT_ID &&
      process.env.GMAIL_OAUTH_CLIENT_SECRET &&
      process.env.GMAIL_OAUTH_REFRESH_TOKEN;

    // Check for service account credentials
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

    // Use createDefaultClient which auto-detects the auth mode
    client = createDefaultClient();

    if (hasOAuth2) {
      console.log('Using OAuth2 authentication (personal Gmail account)');
      // For OAuth2, use GMAIL_TEST_RECIPIENT_EMAIL env var or skip send tests
      testRecipientEmail = process.env.GMAIL_TEST_RECIPIENT_EMAIL || '';
      if (testRecipientEmail) {
        console.log(`Test recipient email: ${testRecipientEmail}`);
      } else {
        console.log('No GMAIL_TEST_RECIPIENT_EMAIL set - send/draft tests will use placeholder');
      }
    } else {
      console.log(
        `Using service account authentication, impersonating: ${process.env.GMAIL_IMPERSONATE_EMAIL}`
      );
      testRecipientEmail = process.env.GMAIL_IMPERSONATE_EMAIL!;
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
      // For drafts, we can use a placeholder recipient since we're not sending
      const draft = await client.createDraft({
        to: testRecipientEmail || process.env.GMAIL_IMPERSONATE_EMAIL || 'test@example.com',
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
      // For OAuth2, we need to discover the email dynamically
      // The sendMessage method internally fetches the sender email from the profile API
      // We'll send to ourselves - for OAuth2 this will be determined by the profile API

      // Skip if we don't have a known recipient (OAuth2 mode without prior API call)
      if (!testRecipientEmail && !process.env.GMAIL_IMPERSONATE_EMAIL) {
        // For OAuth2, we need to send to discover the email - send to the test email if available
        console.warn('Skipping send test - no recipient email available');
        return;
      }

      const recipientEmail = testRecipientEmail || process.env.GMAIL_IMPERSONATE_EMAIL!;

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

  describe('getAttachment', () => {
    it('should download attachments from an email with attachments', async () => {
      // Search for emails with attachments
      const listResult = await client.listMessages({
        q: 'has:attachment',
        maxResults: 5,
      });

      if (listResult.messages.length === 0) {
        console.warn('No emails with attachments found - skipping attachment test');
        return;
      }

      // Find an email that actually has downloadable attachments
      let foundAttachment = false;
      for (const msg of listResult.messages) {
        const message = await client.getMessage(msg.id, { format: 'full' });

        // Recursively find attachments in parts
        const findAttachments = (
          parts: Array<{
            filename?: string;
            mimeType: string;
            body?: { attachmentId?: string; size: number };
            parts?: typeof parts;
          }>
        ): Array<{ filename: string; attachmentId: string; mimeType: string; size: number }> => {
          const result: Array<{
            filename: string;
            attachmentId: string;
            mimeType: string;
            size: number;
          }> = [];
          for (const part of parts) {
            if (part.filename && part.body?.attachmentId) {
              result.push({
                filename: part.filename,
                attachmentId: part.body.attachmentId,
                mimeType: part.mimeType,
                size: part.body.size,
              });
            }
            if (part.parts) {
              result.push(...findAttachments(part.parts));
            }
          }
          return result;
        };

        const attachments = message.payload?.parts ? findAttachments(message.payload.parts) : [];

        if (attachments.length > 0) {
          const att = attachments[0];
          console.log(
            `Found attachment: "${att.filename}" (${att.mimeType}, ${Math.round(att.size / 1024)} KB) on message ${msg.id}`
          );

          // Download the attachment
          const data = await client.getAttachment(msg.id, att.attachmentId);

          expect(data).toHaveProperty('data');
          expect(data).toHaveProperty('size');
          expect(data.data.length).toBeGreaterThan(0);
          expect(data.size).toBeGreaterThan(0);

          console.log(
            `Downloaded attachment: ${data.size} bytes, base64url data length: ${data.data.length}`
          );

          // Verify we can decode the base64url data
          const buffer = Buffer.from(data.data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
          expect(buffer.length).toBeGreaterThan(0);
          console.log(`Decoded to ${buffer.length} bytes of binary data`);

          foundAttachment = true;
          break;
        }
      }

      if (!foundAttachment) {
        console.warn('Checked 5 emails but none had downloadable attachments');
      }
    });
  });

  describe('authentication', () => {
    it('should use the correct authentication method', () => {
      const isOAuth2 = client instanceof OAuth2GmailClient;
      const isServiceAccount = client instanceof ServiceAccountGmailClient;

      expect(isOAuth2 || isServiceAccount).toBe(true);

      if (isOAuth2) {
        console.log('Authenticated using: OAuth2 (personal Gmail)');
      } else {
        console.log('Authenticated using: service_account (Google Workspace)');
      }
    });
  });
});
