import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import type { Email, EmailListItem } from './types.js';

/**
 * Gmail API client interface
 * Defines all methods for interacting with the Gmail API
 */
export interface IGmailClient {
  /**
   * List messages matching a query
   */
  listMessages(options?: {
    q?: string;
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
  }): Promise<{
    messages: EmailListItem[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  }>;

  /**
   * Get a specific message by ID
   */
  getMessage(
    messageId: string,
    options?: {
      format?: 'minimal' | 'full' | 'raw' | 'metadata';
      metadataHeaders?: string[];
    }
  ): Promise<Email>;
}

/**
 * Gmail API client implementation
 */
export class GmailClient implements IGmailClient {
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  private headers: Record<string, string>;

  constructor(private accessToken: string) {
    this.headers = {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  async listMessages(options?: {
    q?: string;
    maxResults?: number;
    pageToken?: string;
    labelIds?: string[];
  }): Promise<{
    messages: EmailListItem[];
    nextPageToken?: string;
    resultSizeEstimate?: number;
  }> {
    const { listMessages } = await import('./gmail-client/lib/list-messages.js');
    return listMessages(this.baseUrl, this.headers, options);
  }

  async getMessage(
    messageId: string,
    options?: {
      format?: 'minimal' | 'full' | 'raw' | 'metadata';
      metadataHeaders?: string[];
    }
  ): Promise<Email> {
    const { getMessage } = await import('./gmail-client/lib/get-message.js');
    return getMessage(this.baseUrl, this.headers, messageId, options);
  }
}

export type ClientFactory = () => IGmailClient;

export function createMCPServer() {
  const server = new Server(
    {
      name: 'gmail-mcp-server',
      version: '0.0.1',
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
        const accessToken = process.env.GMAIL_ACCESS_TOKEN;

        if (!accessToken) {
          throw new Error('GMAIL_ACCESS_TOKEN environment variable must be configured');
        }

        return new GmailClient(accessToken);
      });

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
