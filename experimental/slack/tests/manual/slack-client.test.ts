import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests that hit the real Slack API via the MCP server.
 * These tests are NOT run in CI and require actual API credentials.
 *
 * To run these tests:
 * 1. Set up your .env file with SLACK_BOT_TOKEN
 * 2. Run: npm run test:manual
 */
describe('Slack MCP Server - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      throw new Error('SLACK_BOT_TOKEN environment variable is required');
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        SLACK_BOT_TOKEN: botToken,
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

  describe('Channel Operations', () => {
    it('should list channels', async () => {
      const result = await client.callTool('slack_get_channels', {});
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('channel(s)');
      console.log(`Found channels via slack_get_channels`);

      const idMatch = text.match(/ID: (\S+)/);
      if (idMatch) {
        const nameMatch = text.match(/• #(\S+)/);
        console.log('First channel:', nameMatch?.[1], idMatch[1]);
      }
    });

    it('should get channel info', async () => {
      // First get a channel ID
      const channelsResult = await client.callTool('slack_get_channels', {});
      expect(channelsResult.isError).toBeFalsy();

      const channelsText = (channelsResult.content[0] as { text: string }).text;
      const idMatch = channelsText.match(/ID: (\S+)/);
      expect(idMatch).toBeTruthy();

      const channelId = idMatch![1];
      const result = await client.callTool('slack_get_channel', {
        channel_id: channelId,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('# Channel:');
      console.log(`Channel info retrieved for ${channelId}`);
    });
  });

  describe('Message Operations', () => {
    let testChannelId: string;
    let postedMessageTs: string;

    beforeAll(async () => {
      // Find a test channel
      const channelsResult = await client.callTool('slack_get_channels', {});
      expect(channelsResult.isError).toBeFalsy();

      const channelsText = (channelsResult.content[0] as { text: string }).text;
      const idMatch = channelsText.match(/ID: (\S+)/);
      if (!idMatch) {
        throw new Error('No channels available for testing');
      }
      testChannelId = idMatch[1];
      const nameMatch = channelsText.match(/• #(\S+)/);
      console.log(
        `Using channel ${nameMatch?.[1] ?? 'unknown'} (${testChannelId}) for message tests`
      );
    });

    it('should post a message', async () => {
      const testMessage = `Test message from Slack MCP Server at ${new Date().toISOString()}`;
      const result = await client.callTool('slack_post_message', {
        channel_id: testChannelId,
        text: testMessage,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Message posted successfully');
      const tsMatch = text.match(/Timestamp: (\S+)/);
      expect(tsMatch).toBeTruthy();
      postedMessageTs = tsMatch![1];

      console.log(`Posted message with ts: ${postedMessageTs}`);
    });

    it('should add a reaction to the posted message', async () => {
      if (!postedMessageTs) {
        throw new Error('No message to react to - run post message test first');
      }

      const result = await client.callTool('slack_react_to_message', {
        channel_id: testChannelId,
        message_ts: postedMessageTs,
        emoji: 'white_check_mark',
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Reaction added successfully');
      console.log('Added reaction successfully');
    });

    it('should update the posted message', async () => {
      if (!postedMessageTs) {
        throw new Error('No message to update - run post message test first');
      }

      const updatedMessage = `Updated test message at ${new Date().toISOString()}`;
      const result = await client.callTool('slack_update_message', {
        channel_id: testChannelId,
        message_ts: postedMessageTs,
        text: updatedMessage,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Message updated successfully');
      expect(text).toContain(postedMessageTs);
      console.log('Updated message successfully');
    });

    it('should post a thread reply', async () => {
      if (!postedMessageTs) {
        throw new Error('No message to reply to - run post message test first');
      }

      const replyMessage = `Thread reply at ${new Date().toISOString()}`;
      const result = await client.callTool('slack_reply_to_thread', {
        channel_id: testChannelId,
        thread_ts: postedMessageTs,
        text: replyMessage,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('Reply posted successfully');
      const tsMatch = text.match(/Reply timestamp: (\S+)/);
      expect(tsMatch).toBeTruthy();
      console.log(`Posted thread reply with ts: ${tsMatch![1]}`);
    });

    it('should get thread with replies', async () => {
      if (!postedMessageTs) {
        throw new Error('No thread to fetch - run post message and reply tests first');
      }

      const result = await client.callTool('slack_get_thread', {
        channel_id: testChannelId,
        thread_ts: postedMessageTs,
      });
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('# Thread in channel');
      const repliesMatch = text.match(/## Replies \((\d+)/);
      if (repliesMatch) {
        console.log(`Thread has ${repliesMatch[1]} replies`);
      } else {
        console.log('Thread retrieved (parent message only)');
      }
    });
  });
});
