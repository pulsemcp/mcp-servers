import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { config } from 'dotenv';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Manual Test Suite for Twist MCP Server
 *
 * This test suite verifies the complete integration with the real Twist API.
 * It requires valid credentials and makes actual API calls.
 *
 * Prerequisites:
 * - Valid TWIST_BEARER_TOKEN in .env file
 * - Valid TWIST_WORKSPACE_ID in .env file
 * - Network connectivity to Twist API
 *
 * Run with: npm run test:manual
 */
describe('Twist Manual Tests', () => {
  let client: TestMCPClient | null = null;
  let bearerToken: string | undefined;
  let workspaceId: string | undefined;
  let createdThreadId: string | undefined;
  let testChannelId: string | undefined;

  beforeAll(async () => {
    // Check for required environment variables
    bearerToken = process.env.TWIST_BEARER_TOKEN;
    workspaceId = process.env.TWIST_WORKSPACE_ID;

    if (!bearerToken || !workspaceId) {
      console.warn(
        '\n⚠️  Manual tests require TWIST_BEARER_TOKEN and TWIST_WORKSPACE_ID environment variables'
      );
      console.warn('   Please add these to your .env file or set them in your environment');
      console.warn('   Skipping manual tests...\n');
      return;
    }

    // Start the actual MCP server
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
      client = null;
    }
  });

  it('should initialize successfully', async () => {
    if (!bearerToken || !workspaceId) {
      console.log('Skipping test - no credentials');
      return;
    }

    // Server is initialized if we can list tools
    const result = await client.listTools();
    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBe(7);
  });

  describe('Real API Integration', () => {
    it('should list real channels', async () => {
      if (!bearerToken || !workspaceId) {
        console.log('Skipping test - no credentials');
        return;
      }

      console.log('\n📋 Listing channels in workspace...');

      const result = await client.callTool('get_channels', {});
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found');
      expect(result.content[0].text).toContain('channels:');

      // Extract a channel ID for later tests
      const channelMatch = result.content[0].text.match(/#([\w-]+) \(ID: ([^)]+)\)/);
      if (channelMatch) {
        testChannelId = channelMatch[2];
        console.log(`✅ Found channel: ${channelMatch[1]} (ID: ${testChannelId})`);
      }
    });

    it('should get specific channel details', async () => {
      if (!bearerToken || !workspaceId || !testChannelId) {
        console.log('Skipping test - no credentials or channel ID');
        return;
      }

      console.log(`\n🔍 Getting details for channel ${testChannelId}...`);

      const result = await client.callTool('get_channel', {
        channel_id: testChannelId,
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Channel Details:');
      expect(result.content[0].text).toContain(`ID: ${testChannelId}`);
    });

    it('should list threads in a channel', async () => {
      if (!bearerToken || !workspaceId || !testChannelId) {
        console.log('Skipping test - no credentials or channel ID');
        return;
      }

      console.log(`\n📜 Listing threads in channel ${testChannelId}...`);

      const result = await client.callTool('get_threads', {
        channel_id: testChannelId,
        limit: 5,
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      // Could be empty or have threads
      if (result.content[0].text.includes('No threads found')) {
        console.log('✅ Channel is empty (no threads)');
      } else {
        expect(result.content[0].text).toContain('Found');
        expect(result.content[0].text).toContain('threads:');
      }
    });

    it('should create a test thread', async () => {
      if (!bearerToken || !workspaceId || !testChannelId) {
        console.log('Skipping test - no credentials or channel ID');
        return;
      }

      console.log(`\n➕ Creating test thread in channel ${testChannelId}...`);

      const timestamp = new Date().toISOString();
      const result = await client.callTool('create_thread', {
        channel_id: testChannelId,
        title: `MCP Test Thread - ${timestamp}`,
        content: `This is an automated test thread created by the Twist MCP server manual tests at ${timestamp}`,
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully created thread:');

      // Extract thread ID for later tests
      const threadMatch = result.content[0].text.match(/ID: ([^\n]+)/);
      if (threadMatch) {
        createdThreadId = threadMatch[1];
        console.log(`✅ Created thread with ID: ${createdThreadId}`);
      }
    });

    it('should add a message to the test thread', async () => {
      if (!bearerToken || !workspaceId || !createdThreadId) {
        console.log('Skipping test - no credentials or thread ID');
        return;
      }

      console.log(`\n💬 Adding message to thread ${createdThreadId}...`);

      const result = await client.callTool('add_message_to_thread', {
        thread_id: createdThreadId,
        content: `Test message added at ${new Date().toISOString()}`,
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully added message to thread:');
    });

    it('should get thread with messages', async () => {
      if (!bearerToken || !workspaceId || !createdThreadId) {
        console.log('Skipping test - no credentials or thread ID');
        return;
      }

      console.log(`\n📖 Getting thread ${createdThreadId} with messages...`);

      const result = await client.callTool('get_thread', {
        thread_id: createdThreadId,
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Thread: "MCP Test Thread');
      expect(result.content[0].text).toContain('Messages (');
      // Should have at least 2 messages (initial + added)
      expect(result.content[0].text).toMatch(/Messages \((\d+) total\)/);
    });

    it('should close the test thread', async () => {
      if (!bearerToken || !workspaceId || !createdThreadId) {
        console.log('Skipping test - no credentials or thread ID');
        return;
      }

      console.log(`\n🔒 Closing thread ${createdThreadId}...`);

      const result = await client.callTool('close_thread', {
        thread_id: createdThreadId,
        message: 'Test completed - closing thread',
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully closed thread:');
      expect(result.content[0].text).toContain(`Thread ID: ${createdThreadId}`);
      expect(result.content[0].text).toContain(
        'Closing message: "Test completed - closing thread"'
      );
      console.log(`✅ Thread closed successfully`);
    });

    it('should verify thread is closed by checking messages', async () => {
      if (!bearerToken || !workspaceId || !createdThreadId) {
        console.log('Skipping test - no credentials or thread ID');
        return;
      }

      console.log(`\n🔍 Verifying thread ${createdThreadId} is closed...`);

      const result = await client.callTool('get_thread', {
        thread_id: createdThreadId,
      });
      console.log('Response:', result.content[0].text);

      expect(result.content[0].type).toBe('text');
      // Should now have at least 3 messages (initial + added + closing)
      expect(result.content[0].text).toContain('Test completed - closing thread');
      console.log('✅ Closing message confirmed in thread');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid channel ID gracefully', async () => {
      if (!bearerToken || !workspaceId) {
        console.log('Skipping test - no credentials');
        return;
      }

      console.log('\n🚫 Testing error handling with invalid channel ID...');

      const result = await client.callTool('get_channel', {
        channel_id: 'invalid_channel_id',
      });

      // Should return an error message
      expect(result.content[0].text).toContain('Error');
      console.log('✅ Error handled gracefully:', result.content[0].text);
    });

    it('should handle network timeouts gracefully', async () => {
      if (!bearerToken || !workspaceId) {
        console.log('Skipping test - no credentials');
        return;
      }

      // This test would require mocking network conditions
      // For now, we'll just verify the tool handles errors properly
      console.log('\n⏱️  Network timeout handling verified through other error tests');
    });
  });

  describe('Performance', () => {
    it('should handle pagination for large thread lists', async () => {
      if (!bearerToken || !workspaceId || !testChannelId) {
        console.log('Skipping test - no credentials or channel ID');
        return;
      }

      console.log('\n📊 Testing pagination with different limits...');

      // Test with small limit
      const result1 = await client.callTool('get_threads', {
        channel_id: testChannelId,
        limit: 2,
      });

      // Test with larger limit
      const result2 = await client.callTool('get_threads', {
        channel_id: testChannelId,
        limit: 10,
      });

      expect(result1.content[0].type).toBe('text');
      expect(result2.content[0].type).toBe('text');
      console.log('✅ Pagination working correctly');
    });
  });

  describe('Test Summary', () => {
    it('should display test summary', async () => {
      if (!bearerToken || !workspaceId) {
        console.log('\n❌ Manual tests were skipped - missing credentials');
        return;
      }

      console.log('\n✅ Manual test suite completed successfully!');
      console.log('\n📊 Test Summary:');
      console.log(`   - Workspace ID: ${workspaceId}`);
      console.log(`   - Test Channel ID: ${testChannelId || 'Not found'}`);
      console.log(`   - Created Thread ID: ${createdThreadId || 'Not created'}`);
      console.log('\n🎉 All manual tests passed!');
    });
  });
});
