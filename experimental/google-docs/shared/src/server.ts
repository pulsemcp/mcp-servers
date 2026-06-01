import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JWT, OAuth2Client } from 'google-auth-library';
import { createRegisterTools } from './tools.js';
import type {
  GoogleDoc,
  DocsBatchUpdateRequest,
  DocsBatchUpdateResponse,
  DriveFile,
  DrivePermission,
  DriveCommentList,
} from './types.js';
import type { CreatePermissionOptions } from './google-docs-client/lib/drive-permissions.js';
import type { ListCommentsOptions } from './google-docs-client/lib/drive-comments.js';

/**
 * OAuth scopes required by this server.
 *
 * - `documents`: full read/write of Google Docs content (required for get + batchUpdate).
 * - `drive`: full read/write access to the authenticated/impersonated user's Drive files,
 *   including files created outside this app. Required so the server can export and read
 *   comments (`comments.list`) on arbitrary existing docs — which the narrower `drive.file`
 *   scope cannot do for files the app never created or opened — and so create/trash/delete/
 *   share work across the user's whole Drive rather than only app-created files.
 *
 * `drive` is a strict superset of `drive.file`, so `drive.file` is not listed separately.
 * This is a broad grant: for the service-account (domain-wide delegation) auth mode every
 * scope listed here must also be authorized in the Google Workspace Admin domain-wide-
 * delegation panel, otherwise token acquisition fails. Granting the admin-side scope is an
 * operator responsibility.
 */
export const GOOGLE_DOCS_SCOPES = [
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/drive',
] as const;

/**
 * Google Docs + Drive client interface.
 * Both auth modes (OAuth2 and service account) implement this same surface.
 */
export interface IGoogleDocsClient {
  getDocument(documentId: string): Promise<GoogleDoc>;
  batchUpdate(
    documentId: string,
    requests: DocsBatchUpdateRequest[]
  ): Promise<DocsBatchUpdateResponse>;
  createDocument(options?: { title?: string }): Promise<GoogleDoc>;
  trashDocument(documentId: string): Promise<DriveFile>;
  permanentlyDeleteDocument(documentId: string): Promise<void>;
  exportDocument(
    documentId: string,
    mimeType: string
  ): Promise<{ bytes: Uint8Array; mimeType: string }>;
  createPermission(documentId: string, options: CreatePermissionOptions): Promise<DrivePermission>;
  listComments(documentId: string, options?: ListCommentsOptions): Promise<DriveCommentList>;
}

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
 * Abstract base that owns token caching + mutex refresh.
 * Subclasses implement `refreshTokenImpl()` for their specific auth flow.
 */
abstract class BaseGoogleDocsClient implements IGoogleDocsClient {
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;
  private refreshPromise: Promise<void> | null = null;

  protected abstract refreshTokenImpl(): Promise<{
    token: string;
    expiryDate: number;
  }>;

  protected updateToken(token: string, expiryDate: number): void {
    this.cachedToken = token;
    this.tokenExpiry = expiryDate;
  }

  private async refreshToken(): Promise<void> {
    const { token, expiryDate } = await this.refreshTokenImpl();
    this.updateToken(token, expiryDate);
  }

  protected async getHeaders(): Promise<Record<string, string>> {
    if (this.cachedToken && Date.now() < this.tokenExpiry - 60000) {
      return {
        Authorization: `Bearer ${this.cachedToken}`,
        'Content-Type': 'application/json',
      };
    }

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

  async getDocument(documentId: string): Promise<GoogleDoc> {
    const headers = await this.getHeaders();
    const { getDocument } = await import('./google-docs-client/lib/get-document.js');
    return getDocument(headers, documentId);
  }

  async batchUpdate(
    documentId: string,
    requests: DocsBatchUpdateRequest[]
  ): Promise<DocsBatchUpdateResponse> {
    const headers = await this.getHeaders();
    const { batchUpdate } = await import('./google-docs-client/lib/batch-update.js');
    return batchUpdate(headers, documentId, requests);
  }

  async createDocument(options?: { title?: string }): Promise<GoogleDoc> {
    const headers = await this.getHeaders();
    const { createDocument } = await import('./google-docs-client/lib/create-document.js');
    return createDocument(headers, options);
  }

  async trashDocument(documentId: string): Promise<DriveFile> {
    const headers = await this.getHeaders();
    const { trashFile } = await import('./google-docs-client/lib/drive-files.js');
    return trashFile(headers, documentId);
  }

  async permanentlyDeleteDocument(documentId: string): Promise<void> {
    const headers = await this.getHeaders();
    const { permanentlyDeleteFile } = await import('./google-docs-client/lib/drive-files.js');
    return permanentlyDeleteFile(headers, documentId);
  }

  async exportDocument(
    documentId: string,
    mimeType: string
  ): Promise<{ bytes: Uint8Array; mimeType: string }> {
    const headers = await this.getHeaders();
    const { exportFile } = await import('./google-docs-client/lib/drive-files.js');
    return exportFile(headers, documentId, mimeType);
  }

  async createPermission(
    documentId: string,
    options: CreatePermissionOptions
  ): Promise<DrivePermission> {
    const headers = await this.getHeaders();
    const { createPermission } = await import('./google-docs-client/lib/drive-permissions.js');
    return createPermission(headers, documentId, options);
  }

  async listComments(documentId: string, options?: ListCommentsOptions): Promise<DriveCommentList> {
    const headers = await this.getHeaders();
    const { listComments } = await import('./google-docs-client/lib/drive-comments.js');
    return listComments(headers, documentId, options);
  }
}

export class ServiceAccountGoogleDocsClient extends BaseGoogleDocsClient {
  private jwtClient: JWT;

  constructor(credentials: ServiceAccountCredentials, impersonateEmail: string) {
    super();
    this.jwtClient = new JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [...GOOGLE_DOCS_SCOPES],
      subject: impersonateEmail,
    });
  }

  protected async refreshTokenImpl(): Promise<{
    token: string;
    expiryDate: number;
  }> {
    const tokenResponse = await this.jwtClient.authorize();
    if (!tokenResponse.access_token) {
      throw new Error('Failed to obtain access token from service account');
    }
    return {
      token: tokenResponse.access_token,
      expiryDate: tokenResponse.expiry_date || Date.now() + 3600000,
    };
  }
}

export class OAuth2GoogleDocsClient extends BaseGoogleDocsClient {
  private oauth2Client: OAuth2Client;

  constructor(clientId: string, clientSecret: string, refreshToken: string) {
    super();
    this.oauth2Client = new OAuth2Client(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  protected async refreshTokenImpl(): Promise<{
    token: string;
    expiryDate: number;
  }> {
    const { token, res } = await this.oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Failed to obtain access token from OAuth2 refresh token');
    }
    const expiryDate = res?.data?.expiry_date;
    return {
      token,
      expiryDate: typeof expiryDate === 'number' ? expiryDate : Date.now() + 3600000,
    };
  }
}

export type ClientFactory = () => IGoogleDocsClient;

export interface CreateMCPServerOptions {
  version: string;
}

/**
 * Builds the default client from environment variables.
 *
 * OAuth2 mode (preferred when set):
 *   GOOGLE_DOCS_OAUTH_CLIENT_ID
 *   GOOGLE_DOCS_OAUTH_CLIENT_SECRET
 *   GOOGLE_DOCS_OAUTH_REFRESH_TOKEN
 *
 * Service account mode:
 *   GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL
 *   GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY
 *   GOOGLE_DOCS_IMPERSONATE_EMAIL
 */
export function createDefaultClient(): IGoogleDocsClient {
  const oauthClientId = process.env.GOOGLE_DOCS_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.GOOGLE_DOCS_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.GOOGLE_DOCS_OAUTH_REFRESH_TOKEN;

  if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
    return new OAuth2GoogleDocsClient(oauthClientId, oauthClientSecret, oauthRefreshToken);
  }

  if (oauthClientId || oauthClientSecret || oauthRefreshToken) {
    const missing = [
      !oauthClientId && 'GOOGLE_DOCS_OAUTH_CLIENT_ID',
      !oauthClientSecret && 'GOOGLE_DOCS_OAUTH_CLIENT_SECRET',
      !oauthRefreshToken && 'GOOGLE_DOCS_OAUTH_REFRESH_TOKEN',
    ].filter(Boolean);
    console.warn(
      `Warning: Partial OAuth2 configuration detected. Missing: ${missing.join(', ')}. Falling back to service account mode.`
    );
  }

  const clientEmail = process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL;
  // JSON-encoded env vars typically arrive with literal \n; un-escape so the JWT lib
  // sees real newlines inside the PEM.
  const privateKey = process.env.GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const impersonateEmail = process.env.GOOGLE_DOCS_IMPERSONATE_EMAIL;

  if (!clientEmail) {
    throw new Error('GOOGLE_DOCS_SERVICE_ACCOUNT_CLIENT_EMAIL environment variable must be set.');
  }
  if (!privateKey) {
    throw new Error('GOOGLE_DOCS_SERVICE_ACCOUNT_PRIVATE_KEY environment variable must be set.');
  }
  if (!impersonateEmail) {
    throw new Error('GOOGLE_DOCS_IMPERSONATE_EMAIL environment variable must be set.');
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

  return new ServiceAccountGoogleDocsClient(credentials, impersonateEmail);
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'google-docs-workspace-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    const factory = clientFactory || createDefaultClient;
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
