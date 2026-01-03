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
  private refreshPromise: Promise<void> | null = null;

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

  private async refreshToken(): Promise<void> {
    const tokenResponse = await this.jwtClient.authorize();
    if (!tokenResponse.access_token) {
      throw new Error('Failed to obtain access token from service account');
    }

    this.cachedToken = tokenResponse.access_token;
    // Token typically expires in 1 hour, but use the actual expiry if provided
    this.tokenExpiry = tokenResponse.expiry_date || Date.now() + 3600000;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    // Check if we have a valid cached token (with 60 second buffer)
    if (this.cachedToken && Date.now() < this.tokenExpiry - 60000) {
      return {
        Authorization: `Bearer ${this.cachedToken}`,
        'Content-Type': 'application/json',
      };
    }

    // Use mutex pattern to prevent concurrent token refresh
    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    await this.refreshPromise;

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
 * Uses service account with domain-wide delegation:
 *   - GMAIL_SERVICE_ACCOUNT_KEY_FILE: Path to service account JSON key file
 *   - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate
 */
export function createDefaultClient(): IGmailClient {
  const serviceAccountKeyFile = process.env.GMAIL_SERVICE_ACCOUNT_KEY_FILE;
  const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL;

  if (!serviceAccountKeyFile) {
    throw new Error(
      'GMAIL_SERVICE_ACCOUNT_KEY_FILE environment variable must be set. ' +
        'This should point to your Google Cloud service account JSON key file.'
    );
  }

  if (!impersonateEmail) {
    throw new Error(
      'GMAIL_IMPERSONATE_EMAIL environment variable must be set. ' +
        'This is the email address of the user to access Gmail as.'
    );
  }

  // Read and parse the service account key file
  const keyFileContent = readFileSync(serviceAccountKeyFile, 'utf-8');
  let credentials: ServiceAccountCredentials;
  try {
    credentials = JSON.parse(keyFileContent);
  } catch {
    throw new Error(`Invalid JSON in service account key file: ${serviceAccountKeyFile}`);
  }

  // Validate required credential fields
  const requiredFields = ['client_email', 'private_key'] as const;
  for (const field of requiredFields) {
    if (!credentials[field]) {
      throw new Error(
        `Service account key file missing required field: ${field}. ` +
          'Ensure you are using a valid service account JSON key file.'
      );
    }
  }

  return new ServiceAccountGmailClient(credentials, impersonateEmail);
}

export function createMCPServer() {
  const server = new Server(
    {
      name: 'gmail-workspace-mcp-server',
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
