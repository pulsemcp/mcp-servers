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
      expect(tools.length).toBe(2);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('gmail_list_recent_emails');
      expect(toolNames).toContain('gmail_get_email');
    });
  });

  describe('gmail_list_recent_emails', () => {
    it('should list emails with default parameters', async () => {
      const result = await client!.callTool('gmail_list_recent_emails', {});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('email(s)');
    });

    it('should list emails with custom parameters', async () => {
      const result = await client!.callTool('gmail_list_recent_emails', {
        hours: 48,
        labels: 'INBOX',
        max_results: 5,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('gmail_get_email', () => {
    it('should get email by ID', async () => {
      const result = await client!.callTool('gmail_get_email', {
        email_id: 'msg_001',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Email Details');
      expect(result.content[0].text).toContain('msg_001');
    });

    it('should handle non-existent email', async () => {
      const result = await client!.callTool('gmail_get_email', {
        email_id: 'non_existent_id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
    });
  });
});
