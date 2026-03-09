import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import type { ElicitationHandler } from '../../../../libs/test-mcp-client/build/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = join(__dirname, '../../local/build/index.integration-with-mock.js');

describe('Gmail MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  beforeEach(async () => {
    // Start the server with elicitation disabled (default behavior for existing tests)
    client = new TestMCPClient({
      serverPath: SERVER_PATH,
      env: {
        ELICITATION_ENABLED: 'false',
      },
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
      expect(tools.length).toBe(8);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('list_email_conversations');
      expect(toolNames).toContain('get_email_conversation');
      expect(toolNames).toContain('search_email_conversations');
      expect(toolNames).toContain('download_email_attachments');
      expect(toolNames).toContain('list_draft_emails');
      expect(toolNames).toContain('change_email_conversation');
      expect(toolNames).toContain('upsert_draft_email');
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

  describe('upsert_draft_email', () => {
    it('should create a draft with plaintext_body', async () => {
      const result = await client!.callTool('upsert_draft_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('Draft ID:');
      expect(result.content[0].text).toContain('**Format:** Plain text');
    });

    it('should create a draft with html_body', async () => {
      const result = await client!.callTool('upsert_draft_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html_body: '<p>Hello <b>World</b></p>',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Draft created successfully');
      expect(result.content[0].text).toContain('**Format:** HTML');
    });

    it('should update an existing draft', async () => {
      // First create a draft
      const createResult = await client!.callTool('upsert_draft_email', {
        to: 'recipient@example.com',
        subject: 'Original Subject',
        plaintext_body: 'Original body',
      });
      expect(createResult.content[0].text).toContain('Draft created successfully');

      // Extract draft ID
      const draftIdMatch = (createResult.content[0] as { text: string }).text.match(
        /\*\*Draft ID:\*\*\s*(\S+)/
      );
      expect(draftIdMatch).not.toBeNull();
      const draftId = draftIdMatch![1];

      // Update the draft
      const updateResult = await client!.callTool('upsert_draft_email', {
        draft_id: draftId,
        to: 'updated@example.com',
        subject: 'Updated Subject',
        plaintext_body: 'Updated body',
      });

      expect(updateResult.content).toHaveLength(1);
      expect(updateResult.content[0].text).toContain('Draft updated successfully');
      expect(updateResult.content[0].text).toContain(`**Draft ID:** ${draftId}`);
    });
  });

  describe('list_draft_emails', () => {
    it('should return empty message when no drafts exist', async () => {
      const result = await client!.callTool('list_draft_emails', {});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('No drafts found');
    });

    it('should list drafts after creating one', async () => {
      // Create a draft first
      await client!.callTool('upsert_draft_email', {
        to: 'recipient@example.com',
        subject: 'Integration Test Draft',
        plaintext_body: 'Test body',
      });

      const result = await client!.callTool('list_draft_emails', {});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('draft(s)');
      expect(result.content[0].text).toContain('Draft ID:');
    });
  });

  describe('send_email', () => {
    it('should send a new email with plaintext_body', async () => {
      const result = await client!.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Email sent successfully');
    });

    it('should send a new email with html_body', async () => {
      const result = await client!.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html_body: '<p>Hello <a href="https://example.com">World</a></p>',
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Email sent successfully');
      expect(result.content[0].text).toContain('**Format:** HTML');
    });
  });
});

describe('Gmail MCP Server - Elicitation Integration Tests', () => {
  describe('with elicitation enabled and client supporting it', () => {
    let client: TestMCPClient | null = null;

    afterEach(async () => {
      if (client) {
        await client.disconnect();
        client = null;
      }
    });

    it('should send email when user confirms via elicitation', async () => {
      const elicitationHandler: ElicitationHandler = async ({ message }) => {
        expect(message).toContain('About to send an email');
        expect(message).toContain('recipient@example.com');
        expect(message).toContain('Test Subject');
        return { action: 'accept', content: { confirm: true } };
      };

      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'true',
        },
        elicitationHandler,
      });
      await client.connect();

      const result = await client.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Email sent successfully');
    });

    it('should cancel send when user declines via elicitation', async () => {
      const elicitationHandler: ElicitationHandler = async () => {
        return { action: 'decline' };
      };

      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'true',
        },
        elicitationHandler,
      });
      await client.connect();

      const result = await client.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('cancelled by the user');
    });

    it('should cancel send when user cancels via elicitation', async () => {
      const elicitationHandler: ElicitationHandler = async () => {
        return { action: 'cancel' };
      };

      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'true',
        },
        elicitationHandler,
      });
      await client.connect();

      const result = await client.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('cancelled by the user');
    });

    it('should not send when user sets confirm to false', async () => {
      const elicitationHandler: ElicitationHandler = async () => {
        return { action: 'accept', content: { confirm: false } };
      };

      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'true',
        },
        elicitationHandler,
      });
      await client.connect();

      const result = await client.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('not confirmed');
    });

    it('should include draft ID in elicitation message when sending a draft', async () => {
      let elicitationMessage = '';
      const elicitationHandler: ElicitationHandler = async ({ message }) => {
        elicitationMessage = message;
        return { action: 'accept', content: { confirm: true } };
      };

      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'true',
        },
        elicitationHandler,
      });
      await client.connect();

      // First create a draft
      const draftResult = await client.callTool('upsert_draft_email', {
        to: 'recipient@example.com',
        subject: 'Draft Test',
        plaintext_body: 'Draft body',
      });
      expect(draftResult.isError).toBeFalsy();

      // Extract draft ID from the result
      const draftIdMatch = (draftResult.content[0] as { text: string }).text.match(
        /\*\*Draft ID:\*\*\s*(\S+)/
      );
      expect(draftIdMatch).not.toBeNull();
      const draftId = draftIdMatch![1];

      // Send the draft
      const result = await client.callTool('send_email', {
        from_draft_id: draftId,
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Draft sent successfully');
      expect(elicitationMessage).toContain(draftId);
    });
  });

  describe('with elicitation disabled', () => {
    let client: TestMCPClient | null = null;

    afterEach(async () => {
      if (client) {
        await client.disconnect();
        client = null;
      }
    });

    it('should send email without confirmation when elicitation is disabled', async () => {
      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'false',
        },
      });
      await client.connect();

      const result = await client.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Email sent successfully');
    });
  });

  describe('with elicitation enabled but client not supporting it', () => {
    let client: TestMCPClient | null = null;

    afterEach(async () => {
      if (client) {
        await client.disconnect();
        client = null;
      }
    });

    it('should return error when no elicitation mechanism is available', async () => {
      // No elicitation handler = client doesn't support it, no HTTP fallback URLs
      client = new TestMCPClient({
        serverPath: SERVER_PATH,
        env: {
          ELICITATION_ENABLED: 'true',
        },
      });
      await client.connect();

      const result = await client.callTool('send_email', {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        plaintext_body: 'Test body content',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error sending email');
      expect(result.content[0].text).toContain('no mechanism is available');
    });
  });
});
