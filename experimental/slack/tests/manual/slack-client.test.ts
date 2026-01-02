import { describe, it, expect, beforeAll } from 'vitest';
import { SlackClient } from '../../shared/src/server.js';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
config({ path: path.join(__dirname, '../../.env') });

describe('Slack Client Manual Tests', () => {
  let client: SlackClient;

  beforeAll(() => {
    const botToken = process.env.SLACK_BOT_TOKEN;
    if (!botToken) {
      throw new Error('SLACK_BOT_TOKEN environment variable is required');
    }
    client = new SlackClient(botToken);
  });

  describe('Channel Operations', () => {
    it('should list channels', async () => {
      const channels = await client.getChannels();

      expect(channels).toBeDefined();
      expect(Array.isArray(channels)).toBe(true);
      console.log(`Found ${channels.length} channels`);

      if (channels.length > 0) {
        console.log('First channel:', channels[0].name, channels[0].id);
      }
    });

    it('should get channel info', async () => {
      // First get a channel ID
      const channels = await client.getChannels();
      expect(channels.length).toBeGreaterThan(0);

      const channelId = channels[0].id;
      const channelInfo = await client.getChannel(channelId);

      expect(channelInfo).toBeDefined();
      expect(channelInfo.id).toBe(channelId);
      console.log(`Channel: #${channelInfo.name}`);
      console.log(`Members: ${channelInfo.num_members}`);
    });

    it('should get channel messages', async () => {
      // First get a channel ID
      const channels = await client.getChannels();
      expect(channels.length).toBeGreaterThan(0);

      const channelId = channels[0].id;
      const result = await client.getMessages(channelId, { limit: 5 });

      expect(result).toBeDefined();
      expect(result.messages).toBeDefined();
      console.log(`Found ${result.messages.length} messages`);

      if (result.messages.length > 0) {
        const msg = result.messages[0];
        console.log(`Latest message: ${msg.text?.substring(0, 50)}...`);
        console.log(`Timestamp: ${msg.ts}`);
      }
    });
  });

  describe('Message Operations', () => {
    let testChannelId: string;
    let postedMessageTs: string;

    beforeAll(async () => {
      // Find or create a test channel
      const channels = await client.getChannels();
      // Use the first available channel for testing
      // In a real test setup, you'd want a dedicated test channel
      if (channels.length === 0) {
        throw new Error('No channels available for testing');
      }
      testChannelId = channels[0].id;
      console.log(`Using channel ${channels[0].name} (${testChannelId}) for message tests`);
    });

    it('should post a message', async () => {
      const testMessage = `Test message from Slack MCP Server at ${new Date().toISOString()}`;
      const result = await client.postMessage(testChannelId, testMessage);

      expect(result).toBeDefined();
      expect(result.ts).toBeDefined();
      postedMessageTs = result.ts;

      console.log(`Posted message with ts: ${result.ts}`);
    });

    it('should add a reaction to the posted message', async () => {
      if (!postedMessageTs) {
        throw new Error('No message to react to - run post message test first');
      }

      await client.addReaction(testChannelId, postedMessageTs, 'white_check_mark');
      console.log('Added reaction successfully');
    });

    it('should update the posted message', async () => {
      if (!postedMessageTs) {
        throw new Error('No message to update - run post message test first');
      }

      const updatedMessage = `Updated test message at ${new Date().toISOString()}`;
      const result = await client.updateMessage(testChannelId, postedMessageTs, updatedMessage);

      expect(result).toBeDefined();
      expect(result.ts).toBe(postedMessageTs);
      console.log('Updated message successfully');
    });

    it('should post a thread reply', async () => {
      if (!postedMessageTs) {
        throw new Error('No message to reply to - run post message test first');
      }

      const replyMessage = `Thread reply at ${new Date().toISOString()}`;
      const result = await client.postMessage(testChannelId, replyMessage, {
        threadTs: postedMessageTs,
      });

      expect(result).toBeDefined();
      expect(result.ts).toBeDefined();
      console.log(`Posted thread reply with ts: ${result.ts}`);
    });

    it('should get thread with replies', async () => {
      if (!postedMessageTs) {
        throw new Error('No thread to fetch - run post message and reply tests first');
      }

      const result = await client.getThread(testChannelId, postedMessageTs);

      expect(result).toBeDefined();
      expect(result.messages.length).toBeGreaterThanOrEqual(1);
      console.log(`Thread has ${result.messages.length} messages`);
    });
  });
});
