import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { JWT } from 'google-auth-library';
import { createRegisterTools } from './tools.js';
import type {
  CalendarEvent,
  CalendarEventList,
  CalendarList,
  FreeBusyRequest,
  FreeBusyResponse,
} from './types.js';

/**
 * Google Calendar API client interface
 * Defines all methods for interacting with the Google Calendar API
 */
export interface ICalendarClient {
  /**
   * List events from a calendar
   */
  listEvents(
    calendarId: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      pageToken?: string;
      q?: string;
      singleEvents?: boolean;
      orderBy?: string;
    }
  ): Promise<CalendarEventList>;

  /**
   * Get a specific event by ID
   */
  getEvent(calendarId: string, eventId: string): Promise<CalendarEvent>;

  /**
   * Create a new event
   */
  createEvent(calendarId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent>;

  /**
   * List calendars available to the user
   */
  listCalendars(options?: { maxResults?: number; pageToken?: string }): Promise<CalendarList>;

  /**
   * Query free/busy information
   */
  queryFreebusy(request: FreeBusyRequest): Promise<FreeBusyResponse>;
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
 * Google Calendar API client implementation using service account with domain-wide delegation
 */
export class ServiceAccountCalendarClient implements ICalendarClient {
  private baseUrl = 'https://www.googleapis.com/calendar/v3';
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
      scopes: ['https://www.googleapis.com/auth/calendar'],
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

  async listEvents(
    calendarId: string,
    options?: {
      timeMin?: string;
      timeMax?: string;
      maxResults?: number;
      pageToken?: string;
      q?: string;
      singleEvents?: boolean;
      orderBy?: string;
    }
  ): Promise<CalendarEventList> {
    const headers = await this.getHeaders();
    const { listEvents } = await import('./calendar-client/lib/list-events.js');
    return listEvents(this.baseUrl, headers, calendarId, options);
  }

  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent> {
    const headers = await this.getHeaders();
    const { getEvent } = await import('./calendar-client/lib/get-event.js');
    return getEvent(this.baseUrl, headers, calendarId, eventId);
  }

  async createEvent(calendarId: string, event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const headers = await this.getHeaders();
    const { createEvent } = await import('./calendar-client/lib/create-event.js');
    return createEvent(this.baseUrl, headers, calendarId, event);
  }

  async listCalendars(options?: {
    maxResults?: number;
    pageToken?: string;
  }): Promise<CalendarList> {
    const headers = await this.getHeaders();
    const { listCalendars } = await import('./calendar-client/lib/list-calendars.js');
    return listCalendars(this.baseUrl, headers, options);
  }

  async queryFreebusy(request: FreeBusyRequest): Promise<FreeBusyResponse> {
    const headers = await this.getHeaders();
    const { queryFreebusy } = await import('./calendar-client/lib/query-freebusy.js');
    return queryFreebusy(this.baseUrl, headers, request);
  }
}

export type ClientFactory = () => ICalendarClient;

/**
 * Options for creating the MCP server
 */
export interface CreateMCPServerOptions {
  version: string;
}

/**
 * Creates the default Google Calendar client based on environment variables.
 * Uses service account with domain-wide delegation:
 *   - GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address
 *   - GCAL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)
 *   - GCAL_IMPERSONATE_EMAIL: Email address to impersonate
 */
export function createDefaultClient(): ICalendarClient {
  const clientEmail = process.env.GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL;
  // Handle both literal \n in JSON configs and actual newlines
  const privateKey = process.env.GCAL_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const impersonateEmail = process.env.GCAL_IMPERSONATE_EMAIL;

  if (!clientEmail) {
    throw new Error(
      'GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL environment variable must be set. ' +
        'This is the email address from your Google Cloud service account.'
    );
  }

  if (!privateKey) {
    throw new Error(
      'GCAL_SERVICE_ACCOUNT_PRIVATE_KEY environment variable must be set. ' +
        'This is the private key from your Google Cloud service account (PEM format).'
    );
  }

  if (!impersonateEmail) {
    throw new Error(
      'GCAL_IMPERSONATE_EMAIL environment variable must be set. ' +
        'This is the email address of the user to access Google Calendar as.'
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

  return new ServiceAccountCalendarClient(credentials, impersonateEmail);
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'google-calendar-workspace-mcp-server',
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
