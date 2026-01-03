import { readFileSync } from 'fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JWT } from 'google-auth-library';
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
 * Gmail API client implementation using a static access token
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

/**
 * Service account credentials structure
 */
export interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

/**
 * Gmail API client implementation using service account with domain-wide delegation
 */
export class ServiceAccountGmailClient implements IGmailClient {
  private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  private jwtClient: JWT;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(
    credentials: ServiceAccountCredentials,
    private impersonateEmail: string
  ) {
    this.jwtClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
      subject: impersonateEmail,
    });
  }

  private async getHeaders(): Promise<Record<string, string>> {
    // Check if we have a valid cached token
    if (this.cachedToken && Date.now() < this.tokenExpiry - 60000) {
      return {
        Authorization: `Bearer ${this.cachedToken}`,
        'Content-Type': 'application/json',
      };
    }

    // Get a new access token
    const tokenResponse = await this.jwtClient.authorize();
    if (!tokenResponse.access_token) {
      throw new Error('Failed to obtain access token from service account');
    }

    this.cachedToken = tokenResponse.access_token;
    // Token typically expires in 1 hour, but use the actual expiry if provided
    this.tokenExpiry = tokenResponse.expiry_date || Date.now() + 3600000;

    return {
      Authorization: `Bearer ${this.cachedToken}`,
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
    const headers = await this.getHeaders();
    const { listMessages } = await import('./gmail-client/lib/list-messages.js');
    return listMessages(this.baseUrl, headers, options);
  }

  async getMessage(
    messageId: string,
    options?: {
      format?: 'minimal' | 'full' | 'raw' | 'metadata';
      metadataHeaders?: string[];
    }
  ): Promise<Email> {
    const headers = await this.getHeaders();
    const { getMessage } = await import('./gmail-client/lib/get-message.js');
    return getMessage(this.baseUrl, headers, messageId, options);
  }
}

export type ClientFactory = () => IGmailClient;

/**
 * Creates the default Gmail client based on environment variables.
 * Supports two authentication methods:
 * 1. Service account with domain-wide delegation (recommended):
 *    - GMAIL_SERVICE_ACCOUNT_KEY_FILE: Path to service account JSON key file
 *    - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate
 * 2. Static access token:
 *    - GMAIL_ACCESS_TOKEN: OAuth2 access token
 */
export function createDefaultClient(): IGmailClient {
  const serviceAccountKeyFile = process.env.GMAIL_SERVICE_ACCOUNT_KEY_FILE;
  const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL;
  const accessToken = process.env.GMAIL_ACCESS_TOKEN;

  // Check for service account authentication
  if (serviceAccountKeyFile) {
    if (!impersonateEmail) {
      throw new Error(
        'GMAIL_IMPERSONATE_EMAIL must be set when using service account authentication'
      );
    }

    // Read and parse the service account key file
    const keyFileContent = readFileSync(serviceAccountKeyFile, 'utf-8');
    const credentials: ServiceAccountCredentials = JSON.parse(keyFileContent);

    return new ServiceAccountGmailClient(credentials, impersonateEmail);
  }

  // Fall back to access token authentication
  if (accessToken) {
    return new GmailClient(accessToken);
  }

  throw new Error(
    'Gmail authentication not configured. Set either:\n' +
      '  - GMAIL_SERVICE_ACCOUNT_KEY_FILE and GMAIL_IMPERSONATE_EMAIL for service account auth, or\n' +
      '  - GMAIL_ACCESS_TOKEN for OAuth2 access token auth'
  );
}

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
    const factory = clientFactory || createDefaultClient;

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
