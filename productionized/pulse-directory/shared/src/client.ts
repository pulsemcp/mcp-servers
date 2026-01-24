/**
 * PulseMCP Directory API Client
 */

import type {
  ListServersResponse,
  GetServerResponse,
  ListServersOptions,
  GetServerOptions,
} from './types.js';

const API_BASE_URL = 'https://api.pulsemcp.com';
const API_VERSION = 'v0.1';

export interface PulseDirectoryClientConfig {
  apiKey: string;
  tenantId?: string;
  baseUrl?: string;
}

export interface IPulseDirectoryClient {
  listServers(options?: ListServersOptions): Promise<ListServersResponse>;
  getServer(options: GetServerOptions): Promise<GetServerResponse>;
}

export class PulseDirectoryClient implements IPulseDirectoryClient {
  private apiKey: string;
  private tenantId?: string;
  private baseUrl: string;

  constructor(config: PulseDirectoryClientConfig) {
    this.apiKey = config.apiKey;
    this.tenantId = config.tenantId;
    this.baseUrl = config.baseUrl || API_BASE_URL;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'Content-Type': 'application/json',
    };

    if (this.tenantId) {
      headers['X-Tenant-ID'] = this.tenantId;
    }

    return headers;
  }

  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(`${this.baseUrl}/${API_VERSION}${path}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  async listServers(options: ListServersOptions = {}): Promise<ListServersResponse> {
    const url = this.buildUrl('/servers', {
      cursor: options.cursor,
      limit: options.limit,
      search: options.search,
      version: options.version,
    });

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 403) {
        throw new Error(`Access denied: ${errorMessage}`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${errorMessage}`);
      }

      throw new Error(`API request failed (${response.status}): ${errorMessage}`);
    }

    return response.json() as Promise<ListServersResponse>;
  }

  async getServer(options: GetServerOptions): Promise<GetServerResponse> {
    const { serverName, version = 'latest' } = options;
    const encodedName = encodeURIComponent(serverName);
    const encodedVersion = encodeURIComponent(version);

    const url = this.buildUrl(`/servers/${encodedName}/versions/${encodedVersion}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      if (response.status === 401) {
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (response.status === 403) {
        throw new Error(`Access denied: ${errorMessage}`);
      } else if (response.status === 404) {
        throw new Error(`Server not found: ${serverName} (version: ${version})`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded: ${errorMessage}`);
      }

      throw new Error(`API request failed (${response.status}): ${errorMessage}`);
    }

    return response.json() as Promise<GetServerResponse>;
  }
}

export type ClientFactory = () => IPulseDirectoryClient;
