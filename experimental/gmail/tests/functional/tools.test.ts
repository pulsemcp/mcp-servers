import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockGmailClient } from '../mocks/gmail-client.functional-mock.js';
import { listEmailConversationsTool } from '../../shared/src/tools/list-email-conversations.js';
import { getEmailConversationTool } from '../../shared/src/tools/get-email-conversation.js';
import { searchEmailConversationsTool } from '../../shared/src/tools/search-email-conversations.js';
import { changeEmailConversationTool } from '../../shared/src/tools/change-email-conversation.js';
import { upsertDraftEmailTool } from '../../shared/src/tools/draft-email.js';
import { listDraftEmailsTool } from '../../shared/src/tools/list-draft-emails.js';
import { sendEmailTool } from '../../shared/src/tools/send-email.js';
import { downloadEmailAttachmentsTool } from '../../shared/src/tools/download-email-attachments.js';
import type { IGmailClient } from '../../shared/src/server.js';

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

describe('Gmail MCP Server Tools', () => {
  let mockClient: IGmailClient;
  let mockServer: Server;

  beforeEach(() => {
    mockClient = createMockGmailClient();
    mockServer = {} as Server;
    // Disable elicitation in functional tests (no real server for elicitation)
    process.env.ELICITATION_ENABLED = 'false';
  });

  describe('list_email_conversations', () => {
    it('should list email conversations with default parameters', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Found 2 email conversation(s)');
      expect(result.content[0].text).toContain('Project Update');
      expect(result.content[0].text).toContain('Meeting Reminder');
      expect(result.content[0].text).toContain('alice@example.com');
      expect(mockClient.listMessages).toHaveBeenCalled();
    });

    it('should respect count parameter', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({ count: 1 });

      expect(result.content[0].text).toContain('Found 1 email conversation(s)');
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 1 })
      );
    });

    it('should handle empty email list', async () => {
      (mockClient.listMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0,
      });
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No email conversations found');
    });

    it('should handle errors', async () => {
      (mockClient.listMessages as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing email conversations');
    });

    it('should pass labels to API', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({ labels: 'STARRED,IMPORTANT' });

      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ labelIds: ['STARRED', 'IMPORTANT'] })
      );
    });

    it('should include thread ID in output', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('**Thread ID:** thread_001');
      expect(result.content[0].text).toContain('**Thread ID:** thread_002');
    });

    it('should pass after as query parameter with Unix timestamp', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({ after: '2024-01-15T14:30:00Z' });

      // 2024-01-15T14:30:00Z = 1705329000 Unix timestamp
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'after:1705329000' })
      );
    });

    it('should pass before as query parameter with Unix timestamp', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({ before: '2024-01-20T23:59:59Z' });

      // 2024-01-20T23:59:59Z = 1705795199 Unix timestamp
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'before:1705795199' })
      );
    });

    it('should combine after and before in query', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({ after: '2024-01-15T00:00:00Z', before: '2024-01-20T00:00:00Z' });

      // Verify both after and before are in the query
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: expect.stringContaining('after:') })
      );
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: expect.stringContaining('before:') })
      );
    });

    it('should not include query when datetime filters are not provided', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({});

      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: undefined })
      );
    });
  });

  describe('get_email_conversation', () => {
    it('should get email by ID', async () => {
      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001' });

      expect(result.content[0].text).toContain('# Email Details');
      expect(result.content[0].text).toContain('**ID:** msg_001');
      expect(result.content[0].text).toContain('**Subject:** Project Update');
      expect(result.content[0].text).toContain('**From:** alice@example.com');
      expect(result.content[0].text).toContain('How is everything going?');
      expect(mockClient.getMessage).toHaveBeenCalledWith('msg_001', { format: 'full' });
    });

    it('should require email_id parameter', async () => {
      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should handle non-existent email', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Message not found: msg_999')
      );
      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_999' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving email');
      expect(result.content[0].text).toContain('Message not found');
    });

    it('should show labels', async () => {
      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001' });

      expect(result.content[0].text).toContain('**Labels:** INBOX, UNREAD');
    });

    it('should handle email with no subject', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_no_subject',
        threadId: 'thread_no_subject',
        labelIds: ['INBOX'],
        snippet: 'Email without subject line',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          body: {
            size: 100,
            data: Buffer.from('Body content').toString('base64url'),
          },
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_no_subject' });

      expect(result.content[0].text).toContain('**Subject:** (No Subject)');
    });

    it('should handle email with HTML body when plain text is unavailable', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_html',
        threadId: 'thread_html',
        labelIds: ['INBOX'],
        snippet: 'HTML email',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/alternative',
          headers: [
            { name: 'Subject', value: 'HTML Email' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '1',
              mimeType: 'text/html',
              body: {
                size: 100,
                data: Buffer.from('<p>Hello <b>World</b></p>').toString('base64url'),
              },
            },
          ],
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_html' });

      expect(result.content[0].text).toContain('Hello');
      expect(result.content[0].text).toContain('World');
      expect(result.content[0].text).not.toContain('<p>');
      expect(result.content[0].text).not.toContain('<b>');
    });

    it('should list attachments', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_attachment',
        threadId: 'thread_attachment',
        labelIds: ['INBOX'],
        snippet: 'Email with attachment',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'Subject', value: 'Document Attached' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '0',
              mimeType: 'text/plain',
              body: {
                size: 50,
                data: Buffer.from('See attached').toString('base64url'),
              },
            },
            {
              partId: '1',
              mimeType: 'application/pdf',
              filename: 'document.pdf',
              body: {
                attachmentId: 'att_001',
                size: 102400,
              },
            },
          ],
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_attachment' });

      expect(result.content[0].text).toContain('## Attachments (1)');
      expect(result.content[0].text).toContain('document.pdf');
      expect(result.content[0].text).toContain('application/pdf');
      expect(result.content[0].text).toContain('100 KB');
    });

    it('should handle email with no body', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_no_body',
        threadId: 'thread_no_body',
        labelIds: ['INBOX'],
        snippet: '',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: 'Empty Email' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_no_body' });

      expect(result.content[0].text).toContain('(No body content available)');
    });

    it('should include HTML body when include_html is true', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_html',
        threadId: 'thread_html',
        labelIds: ['INBOX'],
        snippet: 'HTML email',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/alternative',
          headers: [
            { name: 'Subject', value: 'HTML Email' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '0',
              mimeType: 'text/plain',
              body: {
                size: 50,
                data: Buffer.from('Plain text version').toString('base64url'),
              },
            },
            {
              partId: '1',
              mimeType: 'text/html',
              body: {
                size: 100,
                data: Buffer.from('<html><body><h1>Hello</h1><p>World</p></body></html>').toString(
                  'base64url'
                ),
              },
            },
          ],
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_html', include_html: true });

      expect(result.content[0].text).toContain('## HTML Body');
      expect(result.content[0].text).toContain('```html');
      expect(result.content[0].text).toContain(
        '<html><body><h1>Hello</h1><p>World</p></body></html>'
      );
      // Plain text body should also be present
      expect(result.content[0].text).toContain('Plain text version');
    });

    it('should not include HTML body when include_html is false or not specified', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_html',
        threadId: 'thread_html',
        labelIds: ['INBOX'],
        snippet: 'HTML email',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/alternative',
          headers: [
            { name: 'Subject', value: 'HTML Email' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '0',
              mimeType: 'text/plain',
              body: {
                size: 50,
                data: Buffer.from('Plain text version').toString('base64url'),
              },
            },
            {
              partId: '1',
              mimeType: 'text/html',
              body: {
                size: 100,
                data: Buffer.from('<html><body><h1>Hello</h1><p>World</p></body></html>').toString(
                  'base64url'
                ),
              },
            },
          ],
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_html' });

      expect(result.content[0].text).not.toContain('## HTML Body');
      expect(result.content[0].text).not.toContain('```html');
      expect(result.content[0].text).toContain('Plain text version');
    });

    it('should show message when include_html is true but no HTML content available', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_plain_only',
        threadId: 'thread_plain',
        labelIds: ['INBOX'],
        snippet: 'Plain text only email',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: 'Plain Text Email' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          body: {
            size: 50,
            data: Buffer.from('This is plain text only').toString('base64url'),
          },
        },
      });

      const tool = getEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_plain_only', include_html: true });

      expect(result.content[0].text).toContain('## HTML Body');
      expect(result.content[0].text).toContain('(No HTML content available)');
    });
  });

  describe('search_email_conversations', () => {
    it('should search emails by query', async () => {
      const tool = searchEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({ query: 'project' });

      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('project');
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'project' })
      );
    });

    it('should require query parameter', async () => {
      const tool = searchEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should respect count parameter', async () => {
      const tool = searchEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({ query: 'test', count: 5 });

      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 5 })
      );
    });

    it('should handle no results', async () => {
      (mockClient.listMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0,
      });
      const tool = searchEmailConversationsTool(mockServer, () => mockClient);
      const result = await tool.handler({ query: 'nonexistent' });

      expect(result.content[0].text).toContain('No emails found');
    });
  });

  describe('change_email_conversation', () => {
    it('should mark email as read', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001', status: 'read' });

      expect(result.content[0].text).toContain('updated successfully');
      expect(result.content[0].text).toContain('Removed labels: UNREAD');
      expect(mockClient.modifyMessage).toHaveBeenCalledWith('msg_001', {
        addLabelIds: undefined,
        removeLabelIds: ['UNREAD'],
      });
    });

    it('should mark email as unread', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_002', status: 'unread' });

      expect(result.content[0].text).toContain('updated successfully');
      expect(result.content[0].text).toContain('Added labels: UNREAD');
      expect(mockClient.modifyMessage).toHaveBeenCalledWith('msg_002', {
        addLabelIds: ['UNREAD'],
        removeLabelIds: undefined,
      });
    });

    it('should archive email', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001', status: 'archived' });

      expect(result.content[0].text).toContain('updated successfully');
      expect(result.content[0].text).toContain('Removed labels: INBOX');
    });

    it('should star email', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001', is_starred: true });

      expect(result.content[0].text).toContain('updated successfully');
      expect(result.content[0].text).toContain('Added labels: STARRED');
    });

    it('should unstar email', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001', is_starred: false });

      expect(result.content[0].text).toContain('updated successfully');
      expect(result.content[0].text).toContain('Removed labels: STARRED');
    });

    it('should add custom labels', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001', labels: 'IMPORTANT' });

      expect(result.content[0].text).toContain('updated successfully');
      expect(result.content[0].text).toContain('Added labels: IMPORTANT');
    });

    it('should require email_id parameter', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should handle no changes specified', async () => {
      const tool = changeEmailConversationTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001' });

      expect(result.content[0].text).toContain('No changes specified');
    });
  });

  describe('upsert_draft_email', () => {
    it('should create a draft with plaintext_body', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('Draft ID:');
      expect(result.content[0].text).toContain('recipient@example.com');
      expect(result.content[0].text).toContain('Test Subject');
      expect(result.content[0].text).toContain('**Format:** Plain text');
      expect(mockClient.createDraft).toHaveBeenCalled();
    });

    it('should create a draft with html_body', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html_body: '<p>Hello <b>World</b></p>',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('**Format:** HTML');
      expect(mockClient.createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlBody: '<p>Hello <b>World</b></p>',
        })
      );
    });

    it('should create a draft with CC and BCC', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('CC:');
      expect(result.content[0].text).toContain('BCC:');
    });

    it('should create a reply draft with thread_id', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Re: Test Subject',
        plaintext_body: 'Test reply content',
        thread_id: 'thread_001',
        reply_to_email_id: 'msg_001',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('**Thread ID:** thread_001');
      expect(result.content[0].text).toContain('reply in an existing conversation');
    });

    it('should require at least one of plaintext_body or html_body', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'test@example.com',
        subject: 'Test Subject',
      });

      expect(result.isError).toBe(true);
    });

    it('should create a multipart draft when both plaintext_body and html_body are provided', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Plain text version',
        html_body: '<p>HTML version</p>',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('**Format:** Multipart (plain text + HTML)');
      expect(mockClient.createDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          plaintextBody: 'Plain text version',
          htmlBody: '<p>HTML version</p>',
        })
      );
    });

    it('should require to and subject parameters', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({ to: 'test@example.com' });

      expect(result.isError).toBe(true);
    });

    it('should update an existing draft when draft_id is provided', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);

      // First create a draft
      const createResult = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Original Subject',
        plaintext_body: 'Original body',
      });
      expect(createResult.content[0].text).toContain('Draft created successfully');

      // Extract draft ID
      const draftIdMatch = createResult.content[0].text.match(/\*\*Draft ID:\*\*\s*(\S+)/);
      expect(draftIdMatch).not.toBeNull();
      const draftId = draftIdMatch![1];

      // Update the draft
      const updateResult = await tool.handler({
        draft_id: draftId,
        to: 'updated@example.com',
        subject: 'Updated Subject',
        plaintext_body: 'Updated body',
      });

      expect(updateResult.content[0].text).toContain('Draft updated successfully');
      expect(updateResult.content[0].text).toContain(`**Draft ID:** ${draftId}`);
      expect(updateResult.content[0].text).toContain('updated@example.com');
      expect(updateResult.content[0].text).toContain('Updated Subject');
      expect(mockClient.updateDraft).toHaveBeenCalledWith(
        draftId,
        expect.objectContaining({
          to: 'updated@example.com',
          subject: 'Updated Subject',
          plaintextBody: 'Updated body',
        })
      );
    });

    it('should return error when updating a non-existent draft', async () => {
      const tool = upsertDraftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        draft_id: 'non_existent_draft',
        to: 'recipient@example.com',
        subject: 'Test',
        plaintext_body: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error updating draft');
    });
  });

  describe('list_draft_emails', () => {
    it('should return empty message when no drafts exist', async () => {
      const tool = listDraftEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No drafts found');
    });

    it('should list drafts after creating them', async () => {
      // Create a draft first
      const draftTool = upsertDraftEmailTool(mockServer, () => mockClient);
      await draftTool.handler({
        to: 'recipient@example.com',
        subject: 'Test Draft',
        plaintext_body: 'Test body',
      });

      const tool = listDraftEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Found 1 draft(s)');
      expect(result.content[0].text).toContain('Draft ID:');
      expect(result.content[0].text).toContain('Test Draft');
      expect(result.content[0].text).toContain('recipient@example.com');
    });

    it('should filter drafts by thread_id', async () => {
      const draftTool = upsertDraftEmailTool(mockServer, () => mockClient);

      // Create a draft with thread_id
      await draftTool.handler({
        to: 'recipient@example.com',
        subject: 'Thread Draft',
        plaintext_body: 'In thread',
        thread_id: 'thread_001',
        reply_to_email_id: 'msg_001',
      });

      // Create another draft without thread_id
      await draftTool.handler({
        to: 'other@example.com',
        subject: 'Other Draft',
        plaintext_body: 'Not in thread',
      });

      const tool = listDraftEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({ thread_id: 'thread_001' });

      expect(result.content[0].text).toContain('Found 1 draft(s)');
      expect(result.content[0].text).toContain('Thread Draft');
      expect(result.content[0].text).not.toContain('Other Draft');
    });

    it('should return empty message when no drafts match thread_id', async () => {
      const tool = listDraftEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({ thread_id: 'nonexistent_thread' });

      expect(result.content[0].text).toContain('No drafts found');
    });

    it('should handle errors', async () => {
      (mockClient.listDrafts as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));
      const tool = listDraftEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing drafts');
    });
  });

  describe('send_email', () => {
    it('should send a new email with plaintext_body', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('Message ID:');
      expect(result.content[0].text).toContain('Thread ID:');
      expect(result.content[0].text).toContain('**Format:** Plain text');
      expect(mockClient.sendMessage).toHaveBeenCalled();
    });

    it('should send a new email with html_body', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html_body: '<p>Hello <a href="https://example.com">World</a></p>',
      });

      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('**Format:** HTML');
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          htmlBody: '<p>Hello <a href="https://example.com">World</a></p>',
        })
      );
    });

    it('should send a multipart email when both plaintext_body and html_body are provided', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Plain text version',
        html_body: '<p>HTML version</p>',
      });

      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('**Format:** Multipart (plain text + HTML)');
      expect(mockClient.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          plaintextBody: 'Plain text version',
          htmlBody: '<p>HTML version</p>',
        })
      );
    });

    it('should send a draft', async () => {
      // First create a draft
      await (mockClient.createDraft as ReturnType<typeof vi.fn>)({
        to: 'test@example.com',
        subject: 'Test',
        plaintextBody: 'Test',
      });

      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        from_draft_id: 'draft_1',
      });

      expect(result.content[0].text).toContain('Draft sent successfully');
      expect(mockClient.sendDraft).toHaveBeenCalledWith('draft_1');
    });

    it('should send a reply with thread_id', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Re: Test Subject',
        plaintext_body: 'Test reply content',
        thread_id: 'thread_001',
        reply_to_email_id: 'msg_001',
      });

      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('reply in an existing conversation');
    });

    it('should require either from_draft_id OR to/subject/plaintext_body|html_body', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should reject when to and subject provided but no body', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'test@example.com',
        subject: 'Test',
      });

      expect(result.isError).toBe(true);
    });

    it('should handle send error', async () => {
      (mockClient.sendMessage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Failed to send')
      );
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'test@example.com',
        subject: 'Test',
        plaintext_body: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error sending email');
    });
  });

  describe('download_email_attachments', () => {
    const emailWithAttachments = {
      id: 'msg_att',
      threadId: 'thread_att',
      labelIds: ['INBOX'],
      snippet: 'Email with attachments',
      historyId: '12345',
      internalDate: String(Date.now()),
      payload: {
        mimeType: 'multipart/mixed',
        headers: [
          { name: 'Subject', value: 'Files Attached' },
          { name: 'From', value: 'sender@example.com' },
          { name: 'To', value: 'me@example.com' },
          { name: 'Date', value: new Date().toISOString() },
        ],
        parts: [
          {
            partId: '0',
            mimeType: 'text/plain',
            body: {
              size: 50,
              data: Buffer.from('See attached files').toString('base64url'),
            },
          },
          {
            partId: '1',
            mimeType: 'application/pdf',
            filename: 'invoice.pdf',
            body: {
              attachmentId: 'att_001',
              size: 102400,
            },
          },
          {
            partId: '2',
            mimeType: 'text/csv',
            filename: 'data.csv',
            body: {
              attachmentId: 'att_002',
              size: 2048,
            },
          },
        ],
      },
    };

    it('should save all attachments to /tmp/ by default', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_att' });

      expect(result.content[0].text).toContain('# Downloaded Attachments (2)');
      expect(result.content[0].text).toContain('invoice.pdf');
      expect(result.content[0].text).toContain('data.csv');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_att/invoice.pdf');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_att/data.csv');
      expect(result.content[0].text).toContain('Saved Files');
      expect(mockClient.getAttachment).toHaveBeenCalledWith('msg_att', 'att_001');
      expect(mockClient.getAttachment).toHaveBeenCalledWith('msg_att', 'att_002');
    });

    it('should save a specific attachment by filename to /tmp/', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_att', filename: 'invoice.pdf' });

      expect(result.content[0].text).toContain('# Downloaded Attachments (1)');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_att/invoice.pdf');
      expect(result.content[0].text).not.toContain('data.csv');
      expect(mockClient.getAttachment).toHaveBeenCalledWith('msg_att', 'att_001');
      expect(mockClient.getAttachment).toHaveBeenCalledTimes(1);
    });

    it('should return inline content when inline=true', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_att', inline: true });

      expect(result.content[0].text).toContain('# Downloaded Attachments (2)');
      expect(result.content[0].text).toContain('invoice.pdf');
      expect(result.content[0].text).toContain('data.csv');
      expect(result.content[0].text).not.toContain('Saved Files');
      expect(result.content[0].text).not.toContain('/tmp/');
    });

    it('should decode text-based attachments inline', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({
        email_id: 'msg_att',
        filename: 'data.csv',
        inline: true,
      });

      // text/csv is text-based, so content should be decoded
      expect(result.content[0].text).toContain('Column1,Column2');
      expect(result.content[0].text).toContain('value1,value2');
    });

    it('should return base64 for binary attachments inline', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({
        email_id: 'msg_att',
        filename: 'invoice.pdf',
        inline: true,
      });

      expect(result.content[0].text).toContain('**MIME Type:** application/pdf');
      expect(result.content[0].text).toContain('**Encoding:** base64');
    });

    it('should handle email with no attachments', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_no_att',
        threadId: 'thread_no_att',
        labelIds: ['INBOX'],
        snippet: 'No attachments here',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'text/plain',
          headers: [
            { name: 'Subject', value: 'Plain Email' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          body: {
            size: 50,
            data: Buffer.from('Just text').toString('base64url'),
          },
        },
      });

      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_no_att' });

      expect(result.content[0].text).toContain('No attachments found');
    });

    it('should error when filename not found', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_att', filename: 'nonexistent.txt' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
      expect(result.content[0].text).toContain('invoice.pdf');
      expect(result.content[0].text).toContain('data.csv');
    });

    it('should require email_id parameter', async () => {
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should handle API errors', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Message not found: msg_999')
      );
      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_999' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading attachment(s)');
    });

    it('should extract attachments from nested MIME structure', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_nested',
        threadId: 'thread_nested',
        labelIds: ['INBOX'],
        snippet: 'Nested MIME email',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'Subject', value: 'Nested Attachments' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '0',
              mimeType: 'multipart/alternative',
              body: { size: 0 },
              parts: [
                {
                  partId: '0.0',
                  mimeType: 'text/plain',
                  body: {
                    size: 20,
                    data: Buffer.from('Body text').toString('base64url'),
                  },
                },
                {
                  partId: '0.1',
                  mimeType: 'text/html',
                  body: {
                    size: 30,
                    data: Buffer.from('<p>Body text</p>').toString('base64url'),
                  },
                },
              ],
            },
            {
              partId: '1',
              mimeType: 'application/pdf',
              filename: 'report.pdf',
              body: {
                attachmentId: 'att_001',
                size: 4096,
              },
            },
            {
              partId: '2',
              mimeType: 'multipart/mixed',
              body: { size: 0 },
              parts: [
                {
                  partId: '2.0',
                  mimeType: 'image/png',
                  filename: 'screenshot.png',
                  body: {
                    attachmentId: 'att_003',
                    size: 2048,
                  },
                },
              ],
            },
          ],
        },
      });

      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_nested' });

      expect(result.content[0].text).toContain('# Downloaded Attachments (2)');
      expect(result.content[0].text).toContain('report.pdf');
      expect(result.content[0].text).toContain('screenshot.png');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_nested/report.pdf');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_nested/screenshot.png');
      expect(mockClient.getAttachment).toHaveBeenCalledWith('msg_nested', 'att_001');
      expect(mockClient.getAttachment).toHaveBeenCalledWith('msg_nested', 'att_003');
    });

    it('should reject when total size exceeds limit in inline mode', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_large',
        threadId: 'thread_large',
        labelIds: ['INBOX'],
        snippet: 'Large attachments',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'Subject', value: 'Large Files' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '1',
              mimeType: 'application/zip',
              filename: 'huge-file.zip',
              body: {
                attachmentId: 'att_large',
                size: 30 * 1024 * 1024, // 30 MB
              },
            },
          ],
        },
      });

      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_large', inline: true });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exceeds the 25 MB limit');
    });

    it('should sanitize path traversal in filenames', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_traversal',
        threadId: 'thread_traversal',
        labelIds: ['INBOX'],
        snippet: 'Malicious attachment',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'Subject', value: 'Path Traversal' },
            { name: 'From', value: 'attacker@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '1',
              mimeType: 'application/pdf',
              filename: '../../etc/passwd',
              body: {
                attachmentId: 'att_001',
                size: 1024,
              },
            },
          ],
        },
      });

      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_traversal' });

      // File path should use sanitized basename only, not the traversal path
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_traversal/passwd');
      // Must NOT contain the traversal path in the saved file location
      expect(result.content[0].text).not.toContain('`: `/etc/passwd');
      expect(result.content[0].text).not.toContain(
        '`: `/tmp/gmail-attachments-msg_traversal/../../'
      );
    });

    it('should deduplicate filenames when attachments share the same name', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'msg_dup',
        threadId: 'thread_dup',
        labelIds: ['INBOX'],
        snippet: 'Duplicate names',
        historyId: '12345',
        internalDate: String(Date.now()),
        payload: {
          mimeType: 'multipart/mixed',
          headers: [
            { name: 'Subject', value: 'Duplicates' },
            { name: 'From', value: 'sender@example.com' },
            { name: 'To', value: 'me@example.com' },
            { name: 'Date', value: new Date().toISOString() },
          ],
          parts: [
            {
              partId: '1',
              mimeType: 'image/png',
              filename: 'image.png',
              body: { attachmentId: 'att_001', size: 1024 },
            },
            {
              partId: '2',
              mimeType: 'image/png',
              filename: 'image.png',
              body: { attachmentId: 'att_003', size: 2048 },
            },
          ],
        },
      });

      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_dup' });

      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_dup/image.png');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_dup/image (1).png');
    });

    it('should handle getAttachment failure during download', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockResolvedValue(emailWithAttachments);
      (mockClient.getAttachment as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Attachment download failed')
      );

      const tool = downloadEmailAttachmentsTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_att' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading attachment(s)');
    });
  });
});

describe('Tool Groups', () => {
  describe('parseEnabledToolGroups', () => {
    it('should return all groups when no parameter provided', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups();
      expect(groups).toEqual(['readonly', 'readwrite', 'readwrite_external']);
    });

    it('should return all groups for empty string', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups('');
      expect(groups).toEqual(['readonly', 'readwrite', 'readwrite_external']);
    });

    it('should parse single group', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups('readonly');
      expect(groups).toEqual(['readonly']);
    });

    it('should parse multiple groups', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups('readonly,readwrite');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should parse readwrite_external group', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups('readwrite_external');
      expect(groups).toEqual(['readwrite_external']);
    });

    it('should handle whitespace', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups(' readonly , readwrite ');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should handle case insensitivity', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups('READONLY,ReadWrite,READWRITE_EXTERNAL');
      expect(groups).toEqual(['readonly', 'readwrite', 'readwrite_external']);
    });

    it('should filter invalid groups', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const groups = parseEnabledToolGroups('readonly,invalid,readwrite');
      expect(groups).toEqual(['readonly', 'readwrite']);
    });

    it('should return all groups if all specified groups are invalid', async () => {
      const { parseEnabledToolGroups } = await import('../../shared/src/tools.js');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const groups = parseEnabledToolGroups('invalid,unknown');
      expect(groups).toEqual(['readonly', 'readwrite', 'readwrite_external']);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('getAvailableToolGroups', () => {
    it('should return all available tool groups', async () => {
      const { getAvailableToolGroups } = await import('../../shared/src/tools.js');
      const groups = getAvailableToolGroups();
      expect(groups).toEqual(['readonly', 'readwrite', 'readwrite_external']);
    });
  });
});
