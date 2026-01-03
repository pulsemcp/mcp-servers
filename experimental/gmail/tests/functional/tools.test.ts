import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockGmailClient } from '../mocks/gmail-client.functional-mock.js';
import { listRecentEmailsTool } from '../../shared/src/tools/list-recent-emails.js';
import { getEmailTool } from '../../shared/src/tools/get-email.js';
import type { IGmailClient } from '../../shared/src/server.js';

describe('Gmail MCP Server Tools', () => {
  let mockClient: IGmailClient;
  let mockServer: Server;

  beforeEach(() => {
    mockClient = createMockGmailClient();
    mockServer = {} as Server;
  });

  describe('gmail_list_recent_emails', () => {
    it('should list recent emails with default parameters', async () => {
      const tool = listRecentEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Found 2 email(s)');
      expect(result.content[0].text).toContain('Project Update');
      expect(result.content[0].text).toContain('Meeting Reminder');
      expect(result.content[0].text).toContain('alice@example.com');
      expect(mockClient.listMessages).toHaveBeenCalled();
    });

    it('should respect max_results parameter', async () => {
      const tool = listRecentEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({ max_results: 1 });

      expect(result.content[0].text).toContain('Found 1 email(s)');
      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 1 })
      );
    });

    it('should handle empty email list', async () => {
      (mockClient.listMessages as ReturnType<typeof vi.fn>).mockResolvedValue({
        messages: [],
        resultSizeEstimate: 0,
      });
      const tool = listRecentEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No emails found');
    });

    it('should handle errors', async () => {
      (mockClient.listMessages as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );
      const tool = listRecentEmailsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error listing emails');
    });

    it('should pass labels to API', async () => {
      const tool = listRecentEmailsTool(mockServer, () => mockClient);
      await tool.handler({ labels: 'STARRED,IMPORTANT' });

      expect(mockClient.listMessages).toHaveBeenCalledWith(
        expect.objectContaining({ labelIds: ['STARRED', 'IMPORTANT'] })
      );
    });
  });

  describe('gmail_get_email', () => {
    it('should get email by ID', async () => {
      const tool = getEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001' });

      expect(result.content[0].text).toContain('# Email Details');
      expect(result.content[0].text).toContain('**ID:** msg_001');
      expect(result.content[0].text).toContain('**Subject:** Project Update');
      expect(result.content[0].text).toContain('**From:** alice@example.com');
      expect(result.content[0].text).toContain('How is everything going?');
      expect(mockClient.getMessage).toHaveBeenCalledWith('msg_001', { format: 'full' });
    });

    it('should require email_id parameter', async () => {
      const tool = getEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should handle non-existent email', async () => {
      (mockClient.getMessage as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Message not found: msg_999')
      );
      const tool = getEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_999' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error retrieving email');
      expect(result.content[0].text).toContain('Message not found');
    });

    it('should show labels', async () => {
      const tool = getEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({ email_id: 'msg_001' });

      expect(result.content[0].text).toContain('**Labels:** INBOX, UNREAD');
    });
  });
});
