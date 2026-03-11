import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type { Channel, Message, SlackFile } from './types.js';

/**
 * Slack API client interface
 * Defines all methods for interacting with the Slack Web API
 */
export interface ISlackClient {
  /**
   * Get all channels the bot has access to
   */
  getChannels(options?: { types?: string; excludeArchived?: boolean }): Promise<Channel[]>;

  /**
   * Get information about a specific channel
   */
  getChannel(channelId: string): Promise<Channel>;

  /**
   * Get message history from a channel
   */
  getMessages(
    channelId: string,
    options?: {
      limit?: number;
      cursor?: string;
      oldest?: string;
      latest?: string;
    }
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }>;

  /**
   * Get all replies in a thread
   */
  getThread(
    channelId: string,
    threadTs: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }>;

  /**
   * Post a new message to a channel
   */
  postMessage(
    channelId: string,
    text: string,
    options?: {
      threadTs?: string;
      replyBroadcast?: boolean;
    }
  ): Promise<Message>;

  /**
   * Update an existing message
   */
  updateMessage(channelId: string, ts: string, text: string): Promise<Message>;

  /**
   * Add a reaction to a message
   */
  addReaction(channelId: string, timestamp: string, emoji: string): Promise<void>;

  /**
   * Get file metadata from Slack
   */
  getFileInfo(fileId: string): Promise<SlackFile>;

  /**
   * Download a file from Slack (requires authenticated URL)
   */
  downloadFile(fileUrl: string): Promise<Buffer>;

  /**
   * Upload text content as a snippet/file to a channel
   */
  uploadSnippet(
    content: string,
    options: {
      channelId: string;
      filename?: string;
      title?: string;
      threadTs?: string;
      filetype?: string;
    }
  ): Promise<SlackFile>;
}

/**
 * Slack API client implementation
 */
export class SlackClient implements ISlackClient {
  private baseUrl = 'https://slack.com/api';
  private headers: Record<string, string>;

  constructor(private botToken: string) {
    this.headers = {
      Authorization: `Bearer ${botToken}`,
    };
  }

  async getChannels(options?: { types?: string; excludeArchived?: boolean }): Promise<Channel[]> {
    const { getChannels } = await import('./slack-client/lib/get-channels.js');
    return getChannels(this.baseUrl, this.headers, options);
  }

  async getChannel(channelId: string): Promise<Channel> {
    const { getChannel } = await import('./slack-client/lib/get-channel.js');
    return getChannel(this.baseUrl, this.headers, channelId);
  }

  async getMessages(
    channelId: string,
    options?: {
      limit?: number;
      cursor?: string;
      oldest?: string;
      latest?: string;
    }
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const { getMessages } = await import('./slack-client/lib/get-messages.js');
    return getMessages(this.baseUrl, this.headers, channelId, options);
  }

  async getThread(
    channelId: string,
    threadTs: string,
    options?: {
      limit?: number;
      cursor?: string;
    }
  ): Promise<{
    messages: Message[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const { getThread } = await import('./slack-client/lib/get-thread.js');
    return getThread(this.baseUrl, this.headers, channelId, threadTs, options);
  }

  async postMessage(
    channelId: string,
    text: string,
    options?: {
      threadTs?: string;
      replyBroadcast?: boolean;
    }
  ): Promise<Message> {
    const { postMessage } = await import('./slack-client/lib/post-message.js');
    return postMessage(this.baseUrl, this.headers, channelId, text, options);
  }

  async updateMessage(channelId: string, ts: string, text: string): Promise<Message> {
    const { updateMessage } = await import('./slack-client/lib/update-message.js');
    return updateMessage(this.baseUrl, this.headers, channelId, ts, text);
  }

  async addReaction(channelId: string, timestamp: string, emoji: string): Promise<void> {
    const { addReaction } = await import('./slack-client/lib/add-reaction.js');
    return addReaction(this.baseUrl, this.headers, channelId, timestamp, emoji);
  }

  async getFileInfo(fileId: string): Promise<SlackFile> {
    const { getFileInfo } = await import('./slack-client/lib/get-file-info.js');
    return getFileInfo(this.baseUrl, this.headers, fileId);
  }

  async downloadFile(fileUrl: string): Promise<Buffer> {
    const { downloadFile } = await import('./slack-client/lib/download-file.js');
    return downloadFile(this.headers, fileUrl);
  }

  async uploadSnippet(
    content: string,
    options: {
      channelId: string;
      filename?: string;
      title?: string;
      threadTs?: string;
      filetype?: string;
    }
  ): Promise<SlackFile> {
    const { uploadSnippet } = await import('./slack-client/lib/upload-snippet.js');
    return uploadSnippet(this.baseUrl, this.headers, content, options);
  }
}

export type ClientFactory = () => ISlackClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'slack-workspace-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    // Use provided factory or create default client
    const factory =
      clientFactory ||
      (() => {
        const botToken = process.env.SLACK_BOT_TOKEN;

        if (!botToken) {
          throw new Error('SLACK_BOT_TOKEN environment variable must be configured');
        }

        return new SlackClient(botToken);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
