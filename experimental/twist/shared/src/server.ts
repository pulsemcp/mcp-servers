import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';

// Twist API client interface for external API interactions
export interface ITwistClient {
  // Channel operations
  getChannels(): Promise<Array<Channel>>;
  getChannel(channelId: string): Promise<Channel>;

  // Thread operations
  getThreads(
    channelId: string,
    options?: { limit?: number; newerThanTs?: number }
  ): Promise<Array<Thread>>;
  getThread(threadId: string): Promise<ThreadWithMessages>;
  createThread(channelId: string, title: string, content: string): Promise<Thread>;

  // Message operations
  addMessageToThread(threadId: string, content: string): Promise<Message>;
}

// Type definitions
export interface Channel {
  id: string;
  name: string;
  description?: string;
  workspace_id: string;
  archived?: boolean;
  created_ts?: number;
}

export interface Thread {
  id: string;
  title: string;
  channel_id: string;
  workspace_id: string;
  creator?: string;
  created_ts?: number;
  last_updated_ts?: number;
  archived?: boolean;
}

export interface ThreadWithMessages extends Thread {
  messages?: Message[];
}

export interface Message {
  id: string;
  thread_id: string;
  content: string;
  creator?: string;
  created_ts?: number;
}

// Twist API client implementation
export class TwistClient implements ITwistClient {
  private baseUrl = 'https://api.twist.com/api/v3';
  private headers: Record<string, string>;

  constructor(
    private bearerToken: string,
    private workspaceId: string
  ) {
    this.headers = {
      Authorization: `Bearer ${bearerToken}`,
      'Content-Type': 'application/json',
    };
  }

  async getChannels(): Promise<Array<Channel>> {
    const { getChannels } = await import('./twist-client/lib/get-channels.js');
    return getChannels(this.baseUrl, this.headers, this.workspaceId);
  }

  async getChannel(channelId: string): Promise<Channel> {
    const { getChannel } = await import('./twist-client/lib/get-channel.js');
    return getChannel(this.baseUrl, this.headers, channelId);
  }

  async getThreads(
    channelId: string,
    options?: { limit?: number; newerThanTs?: number }
  ): Promise<Array<Thread>> {
    const { getThreads } = await import('./twist-client/lib/get-threads.js');
    return getThreads(this.baseUrl, this.headers, channelId, options);
  }

  async getThread(threadId: string): Promise<ThreadWithMessages> {
    const { getThread } = await import('./twist-client/lib/get-thread.js');
    return getThread(this.baseUrl, this.headers, threadId);
  }

  async createThread(channelId: string, title: string, content: string): Promise<Thread> {
    const { createThread } = await import('./twist-client/lib/create-thread.js');
    return createThread(this.baseUrl, this.headers, channelId, title, content);
  }

  async addMessageToThread(threadId: string, content: string): Promise<Message> {
    const { addMessageToThread } = await import('./twist-client/lib/add-message-to-thread.js');
    return addMessageToThread(this.baseUrl, this.headers, threadId, content);
  }
}

export type ClientFactory = () => ITwistClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'mcp-server-twist',
      version: '0.1.0',
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
        // Get configuration from environment variables
        const bearerToken = process.env.TWIST_BEARER_TOKEN;
        const workspaceId = process.env.TWIST_WORKSPACE_ID;

        if (!bearerToken) {
          throw new Error('TWIST_BEARER_TOKEN environment variable must be configured');
        }

        if (!workspaceId) {
          throw new Error('TWIST_WORKSPACE_ID environment variable must be configured');
        }

        return new TwistClient(bearerToken, workspaceId);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
