import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Gmail MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  beforeEach(async () => {
    // Start the server with mock data
    client = new TestMCPClient({
      serverPath: join(__dirname, '../../local/build/index.integration-with-mock.js'),
    });

    await client.connect();
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Server Setup', () => {
    it('should connect successfully', async () => {
      expect(client).not.toBeNull();
    });

    it('should list available tools', async () => {
      const result = await client!.listTools();
      const tools = result.tools;
      expect(tools.length).toBe(7);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('list_email_conversations');
      expect(toolNames).toContain('get_email_conversation');
      expect(toolNames).toContain('search_email_conversations');
      expect(toolNames).toContain('download_email_attachments');
      expect(toolNames).toContain('change_email_conversation');
      expect(toolNames).toContain('draft_email');
      expect(toolNames).toContain('send_email');
    });
  });

  describe('list_email_conversations', () => {
    it('should list emails with default parameters', async () => {
      const result = await client!.callTool('list_email_conversations', {});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('email conversation(s)');
    });

    it('should list emails with custom parameters', async () => {
      const result = await client!.callTool('list_email_conversations', {
        labels: 'INBOX',
        count: 5,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('get_email_conversation', () => {
    it('should get email by ID', async () => {
      const result = await client!.callTool('get_email_conversation', {
        email_id: 'msg_001',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Email Details');
      expect(result.content[0].text).toContain('msg_001');
    });

    it('should handle non-existent email', async () => {
      const result = await client!.callTool('get_email_conversation', {
        email_id: 'non_existent_id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('search_email_conversations', () => {
    it('should search emails by query', async () => {
      const result = await client!.callTool('search_email_conversations', {
        query: 'project',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('download_email_attachments', () => {
    it('should save attachments to /tmp/ by default', async () => {
      const result = await client!.callTool('download_email_attachments', {
        email_id: 'msg_003',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Downloaded Attachments (1)');
      expect(result.content[0].text).toContain('invoice.pdf');
      expect(result.content[0].text).toContain('/tmp/gmail-attachments-msg_003/invoice.pdf');
      expect(result.content[0].text).toContain('Saved Files');
    });

    it('should return inline content when inline=true', async () => {
      const result = await client!.callTool('download_email_attachments', {
        email_id: 'msg_003',
        inline: true,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Downloaded Attachments (1)');
      expect(result.content[0].text).toContain('invoice.pdf');
      expect(result.content[0].text).not.toContain('Saved Files');
    });

    it('should handle email with no attachments', async () => {
      const result = await client!.callTool('download_email_attachments', {
        email_id: 'msg_001',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('No attachments found');
    });

    it('should handle non-existent email', async () => {
      const result = await client!.callTool('download_email_attachments', {
        email_id: 'non_existent_id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });

  describe('change_email_conversation', () => {
    it('should mark email as read', async () => {
      const result = await client!.callTool('change_email_conversation', {
        email_id: 'msg_001',
        status: 'read',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('updated successfully');
    });

    it('should star email', async () => {
      const result = await client!.callTool('change_email_conversation', {
        email_id: 'msg_001',
        is_starred: true,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('STARRED');
    });
  });

  describe('draft_email', () => {
    it('should create a draft', async () => {
      const result = await client!.callTool('draft_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('Draft ID:');
    });
  });

  describe('send_email', () => {
    it('should send a new email', async () => {
      const result = await client!.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test body content',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Email sent successfully');
    });
  });
});
