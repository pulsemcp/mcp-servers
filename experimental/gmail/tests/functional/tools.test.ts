import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockGmailClient } from '../mocks/gmail-client.functional-mock.js';
import { listEmailConversationsTool } from '../../shared/src/tools/list-email-conversations.js';
import { getEmailConversationTool } from '../../shared/src/tools/get-email-conversation.js';
import { searchEmailConversationsTool } from '../../shared/src/tools/search-email-conversations.js';
import { changeEmailConversationTool } from '../../shared/src/tools/change-email-conversation.js';
import { draftEmailTool } from '../../shared/src/tools/draft-email.js';
import { sendEmailTool } from '../../shared/src/tools/send-email.js';
import type { IGmailClient } from '../../shared/src/server.js';

describe('Gmail MCP Server Tools', () => {
  let mockClient: IGmailClient;
  let mockServer: Server;

  beforeEach(() => {
    mockClient = createMockGmailClient();
    mockServer = {} as Server;
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

    it('should pass after_date as query parameter', async () => {
      const tool = listEmailConversationsTool(mockServer, () => mockClient);
      await tool.handler({ after_date: '2024-01-15' });

      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'after:2024/01/15' })
      );
    });

    it('should not include query when after_date is not provided', async () => {
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

  describe('draft_email', () => {
    it('should create a draft', async () => {
      const tool = draftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('Draft ID:');
      expect(result.content[0].text).toContain('recipient@example.com');
      expect(result.content[0].text).toContain('Test Subject');
      expect(mockClient.createDraft).toHaveBeenCalled();
    });

    it('should create a draft with CC and BCC', async () => {
      const tool = draftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
        cc: 'cc@example.com',
        bcc: 'bcc@example.com',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('CC:');
      expect(result.content[0].text).toContain('BCC:');
    });

    it('should create a reply draft with thread_id', async () => {
      const tool = draftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Re: Test Subject',
        body: 'Test reply content',
        thread_id: 'thread_001',
        reply_to_email_id: 'msg_001',
      });

      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('**Thread ID:** thread_001');
      expect(result.content[0].text).toContain('reply in an existing conversation');
    });

    it('should require to, subject, and body parameters', async () => {
      const tool = draftEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({ to: 'test@example.com' });

      expect(result.isError).toBe(true);
    });
  });

  describe('send_email', () => {
    it('should send a new email', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
      });

      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('Message ID:');
      expect(result.content[0].text).toContain('Thread ID:');
      expect(mockClient.sendMessage).toHaveBeenCalled();
    });

    it('should send a draft', async () => {
      // First create a draft
      await (mockClient.createDraft as ReturnType<typeof vi.fn>)({
        to: 'test@example.com',
        subject: 'Test',
        body: 'Test',
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
        body: 'Test reply content',
        thread_id: 'thread_001',
        reply_to_email_id: 'msg_001',
      });

      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('reply in an existing conversation');
    });

    it('should require either from_draft_id OR to/subject/body', async () => {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({});

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
        body: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error sending email');
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
