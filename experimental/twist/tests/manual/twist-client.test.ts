import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual Test Suite for Twist MCP Server
 *
 * This test suite verifies the complete integration with the real Twist API
 * via the MCP server using TestMCPClient.
 *
 * Prerequisites:
 * - Valid TWIST_BEARER_TOKEN in .env file
 * - Valid TWIST_WORKSPACE_ID in .env file
 * - Network connectivity to Twist API
 *
 * Run with: npm run test:manual
 */
describe('Twist Client Manual Tests', () => {
  let client: TestMCPClient;
  let testChannelId: string | undefined;
  let createdThreadId: string | undefined;

  beforeAll(async () => {
    const bearerToken = process.env.TWIST_BEARER_TOKEN;
    const workspaceId = process.env.TWIST_WORKSPACE_ID;

    if (!bearerToken || !workspaceId) {
      throw new Error(
        'Manual tests require TWIST_BEARER_TOKEN and TWIST_WORKSPACE_ID environment variables'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        TWIST_BEARER_TOKEN: bearerToken,
        TWIST_WORKSPACE_ID: workspaceId,
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  describe('get_channels', () => {
    it('should list real channels', async () => {
      const result = await client.callTool('get_channels', {});
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();

      // Try to extract a channel ID for subsequent tests
      const idMatch = text.match(/ID:\s*(\d+)/i);
      if (idMatch) {
        testChannelId = idMatch[1];
        console.log(`Using test channel ID: ${testChannelId}`);
      }

      console.log(`get_channels response length: ${text.length} chars`);
    });
  });

  describe('get_channel', () => {
    it('should get specific channel details', async () => {
      if (!testChannelId) {
        console.log('Skipping test - no channel ID from previous test');
        return;
      }

      const result = await client.callTool('get_channel', {
        channel_id: testChannelId,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`get_channel response length: ${text.length} chars`);
    });
  });

  describe('create_thread', () => {
    it('should create a test thread', async () => {
      if (!testChannelId) {
        console.log('Skipping test - no channel ID');
        return;
      }

      const timestamp = new Date().toISOString();
      const result = await client.callTool('create_thread', {
        channel_id: testChannelId,
        title: `MCP Test Thread - ${timestamp}`,
        content: `This is an automated test thread created by the Twist MCP server manual tests at ${timestamp}`,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();

      // Extract thread ID for subsequent tests
      const idMatch = text.match(/ID:\s*(\d+)/i);
      if (idMatch) {
        createdThreadId = idMatch[1];
        console.log(`Created thread with ID: ${createdThreadId}`);
      }
    });
  });

  describe('add_message_to_thread', () => {
    it('should add a message to the test thread', async () => {
      if (!createdThreadId) {
        console.log('Skipping test - no thread created');
        return;
      }

      const timestamp = new Date().toISOString();
      const result = await client.callTool('add_message_to_thread', {
        thread_id: createdThreadId,
        content: `Test message added at ${timestamp}`,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`add_message_to_thread response length: ${text.length} chars`);
    });
  });

  describe('get_thread', () => {
    it('should get thread with messages', async () => {
      if (!createdThreadId) {
        console.log('Skipping test - no thread created');
        return;
      }

      const result = await client.callTool('get_thread', {
        thread_id: createdThreadId,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log(`get_thread response length: ${text.length} chars`);
    });
  });

  describe('close_thread', () => {
    it('should close the test thread', async () => {
      if (!createdThreadId) {
        console.log('Skipping test - no thread created');
        return;
      }

      const result = await client.callTool('close_thread', {
        thread_id: createdThreadId,
        close_message: 'Test completed - closing thread',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toBeDefined();
      console.log('Thread closed successfully');
    });
  });
});
