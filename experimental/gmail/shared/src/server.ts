import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JWT, OAuth2Client } from 'google-auth-library';
import { createRegisterTools } from './tools.js';
import type { Email, EmailListItem } from './types.js';

/**
 * Gmail API scopes required by this server.
 * Shared between service account JWT, OAuth2 consent flow, and documentation.
 */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send',
] as const;

/**
 * Draft message structure
 */
export interface Draft {
  id: string;
  message: Email;
}

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

  /**
   * Modify labels on a message (add/remove labels)
   */
  modifyMessage(
    messageId: string,
    options: {
      addLabelIds?: string[];
      removeLabelIds?: string[];
    }
  ): Promise<Email>;

  /**
   * Create a draft email
   */
  createDraft(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<Draft>;

  /**
   * Get a draft by ID
   */
  getDraft(draftId: string): Promise<Draft>;

  /**
   * List drafts
   */
  listDrafts(options?: { maxResults?: number; pageToken?: string }): Promise<{
    drafts: Array<{ id: string; message: EmailListItem }>;
    nextPageToken?: string;
    resultSizeEstimate?: number;
  }>;

  /**
   * Delete a draft
   */
  deleteDraft(draftId: string): Promise<void>;

  /**
   * Send an email (either directly or from a draft)
   */
  sendMessage(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<Email>;

  /**
   * Send a draft
   */
  sendDraft(draftId: string): Promise<Email>;

  /**
   * Get attachment data by message ID and attachment ID
   */
  getAttachment(messageId: string, attachmentId: string): Promise<{ data: string; size: number }>;
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
 * Abstract base class for Gmail API clients.
 * Provides shared token management (caching, mutex refresh) and all
 * IGmailClient method implementations. Subclasses only need to implement
 * the authentication-specific methods.
 */
abstract class BaseGmailClient implements IGmailClient {
  protected baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<void> | null = null;

  /**
   * Perform the authentication-specific token refresh.
   * Must set this.cachedToken and this.tokenExpiry via updateToken().
   */
  protected abstract refreshTokenImpl(): Promise<{
    token: string;
    expiryDate: number;
  }>;

  /**
   * Get the sender email address for composing/sending emails.
   * Service account uses the impersonation email; OAuth2 fetches from profile API.
   */
  protected abstract getSenderEmail(): Promise<string>;

  protected updateToken(token: string, expiryDate: number): void {
    this.cachedToken = token;
    this.tokenExpiry = expiryDate;
  }

  private async refreshToken(): Promise<void> {
    const { token, expiryDate } = await this.refreshTokenImpl();
    this.updateToken(token, expiryDate);
  }

  protected async getHeaders(): Promise<Record<string, string>> {
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

  async modifyMessage(
    messageId: string,
    options: {
      addLabelIds?: string[];
      removeLabelIds?: string[];
    }
  ): Promise<Email> {
    const headers = await this.getHeaders();
    const { modifyMessage } = await import('./gmail-client/lib/modify-message.js');
    return modifyMessage(this.baseUrl, headers, messageId, options);
  }

  async createDraft(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<Draft> {
    const headers = await this.getHeaders();
    const senderEmail = await this.getSenderEmail();
    const { createDraft } = await import('./gmail-client/lib/drafts.js');
    return createDraft(this.baseUrl, headers, senderEmail, options);
  }

  async getDraft(draftId: string): Promise<Draft> {
    const headers = await this.getHeaders();
    const { getDraft } = await import('./gmail-client/lib/drafts.js');
    return getDraft(this.baseUrl, headers, draftId);
  }

  async listDrafts(options?: { maxResults?: number; pageToken?: string }): Promise<{
    drafts: Array<{ id: string; message: EmailListItem }>;
    nextPageToken?: string;
    resultSizeEstimate?: number;
  }> {
    const headers = await this.getHeaders();
    const { listDrafts } = await import('./gmail-client/lib/drafts.js');
    return listDrafts(this.baseUrl, headers, options);
  }

  async deleteDraft(draftId: string): Promise<void> {
    const headers = await this.getHeaders();
    const { deleteDraft } = await import('./gmail-client/lib/drafts.js');
    return deleteDraft(this.baseUrl, headers, draftId);
  }

  async sendMessage(options: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    threadId?: string;
    inReplyTo?: string;
    references?: string;
  }): Promise<Email> {
    const headers = await this.getHeaders();
    const senderEmail = await this.getSenderEmail();
    const { sendMessage } = await import('./gmail-client/lib/send-message.js');
    return sendMessage(this.baseUrl, headers, senderEmail, options);
  }

  async sendDraft(draftId: string): Promise<Email> {
    const headers = await this.getHeaders();
    const { sendDraft } = await import('./gmail-client/lib/send-message.js');
    return sendDraft(this.baseUrl, headers, draftId);
  }

  async getAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<{ data: string; size: number }> {
    const headers = await this.getHeaders();
    const { getAttachment } = await import('./gmail-client/lib/get-attachment.js');
    return getAttachment(this.baseUrl, headers, messageId, attachmentId);
  }
}

/**
 * Gmail API client implementation using service account with domain-wide delegation
 */
export class ServiceAccountGmailClient extends BaseGmailClient {
  private jwtClient: JWT;
  private impersonateEmail: string;

  constructor(credentials: ServiceAccountCredentials, impersonateEmail: string) {
    super();
    this.impersonateEmail = impersonateEmail;
    this.jwtClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [...GMAIL_SCOPES],
      subject: impersonateEmail,
    });
  }

  protected async refreshTokenImpl(): Promise<{ token: string; expiryDate: number }> {
    const tokenResponse = await this.jwtClient.authorize();
    if (!tokenResponse.access_token) {
      throw new Error('Failed to obtain access token from service account');
    }
    return {
      token: tokenResponse.access_token,
      // Token typically expires in 1 hour, but use the actual expiry if provided
      expiryDate: tokenResponse.expiry_date || Date.now() + 3600000,
    };
  }

  protected async getSenderEmail(): Promise<string> {
    return this.impersonateEmail;
  }
}

/**
 * Gmail API client implementation using OAuth2 user authentication.
 * Enables access to personal Gmail accounts (e.g., @gmail.com) that cannot
 * use domain-wide delegation.
 */
export class OAuth2GmailClient extends BaseGmailClient {
  private oauth2Client: OAuth2Client;
  private userEmail: string | null = null;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    super();
    this.oauth2Client = new OAuth2Client(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  protected async refreshTokenImpl(): Promise<{ token: string; expiryDate: number }> {
    const { token, res } = await this.oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to obtain access token from OAuth2 refresh token');
    }
    // Use expiry from response if available, otherwise default to 1 hour
    const expiryDate = res?.data?.expiry_date;
    return {
      token,
      expiryDate: typeof expiryDate === 'number' ? expiryDate : Date.now() + 3600000,
    };
  }

  /**
   * Fetches the authenticated user's email address from the Gmail profile API.
   * Caches the result for subsequent calls.
   */
  protected async getSenderEmail(): Promise<string> {
    if (this.userEmail) {
      return this.userEmail;
    }

    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseUrl}/profile`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Failed to fetch Gmail profile: ${response.status} ${response.statusText}${body ? ` - ${body}` : ''}`
      );
    }

    const profile = (await response.json()) as { emailAddress: string };
    this.userEmail = profile.emailAddress;
    return this.userEmail;
  }
}

export type ClientFactory = () => IGmailClient;

export interface CreateMCPServerOptions {
  version: string;
}

/**
 * Creates the default Gmail client based on environment variables.
 *
 * Supports two authentication modes:
 *
 * 1. OAuth2 (for personal Gmail accounts):
 *   - GMAIL_OAUTH_CLIENT_ID: OAuth2 client ID from Google Cloud Console
 *   - GMAIL_OAUTH_CLIENT_SECRET: OAuth2 client secret
 *   - GMAIL_OAUTH_REFRESH_TOKEN: Refresh token from one-time consent flow
 *
 * 2. Service Account (for Google Workspace accounts):
 *   - GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address
 *   - GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)
 *   - GMAIL_IMPERSONATE_EMAIL: Email address to impersonate
 *
 * If OAuth2 credentials are present, OAuth2 mode is used. Otherwise, service account mode is used.
 */
export function createDefaultClient(): IGmailClient {
  // Check for OAuth2 credentials first
  const oauthClientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    return new OAuth2GmailClient(oauthClientId, oauthClientSecret, oauthRefreshToken);
  }

  // Warn if some OAuth2 vars are set but not all (likely misconfiguration)
  if (oauthClientId || oauthClientSecret || oauthRefreshToken) {
    const missing = [
      !oauthClientId && 'GMAIL_OAUTH_CLIENT_ID',
      !oauthClientSecret && 'GMAIL_OAUTH_CLIENT_SECRET',
      !oauthRefreshToken && 'GMAIL_OAUTH_REFRESH_TOKEN',
    ].filter(Boolean);
    console.warn(
      `Warning: Partial OAuth2 configuration detected. Missing: ${missing.join(', ')}. Falling back to service account mode.`
    );
  }

  // Fall back to service account mode
  const clientEmail = process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL;
  // Handle both literal \n in JSON configs and actual newlines
  const privateKey = process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const impersonateEmail = process.env.GMAIL_IMPERSONATE_EMAIL;

  if (!clientEmail) {
    throw new Error(
      'GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL environment variable must be set. ' +
        'This is the email address from your Google Cloud service account.'
    );
  }

  if (!privateKey) {
    throw new Error(
      'GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY environment variable must be set. ' +
        'This is the private key from your Google Cloud service account (PEM format).'
    );
  }

  if (!impersonateEmail) {
    throw new Error(
      'GMAIL_IMPERSONATE_EMAIL environment variable must be set. ' +
        'This is the email address of the user to access Gmail as.'
    );
  }

  const credentials: ServiceAccountCredentials = {
    type: 'service_account',
    project_id: '',
    private_key_id: '',
    private_key: privateKey,
    client_email: clientEmail,
    client_id: '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: '',
  };

  return new ServiceAccountGmailClient(credentials, impersonateEmail);
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'gmail-workspace-mcp-server',
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
    const factory = clientFactory || createDefaultClient;

    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
