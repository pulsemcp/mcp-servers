/**
 * PulseMCP Sub-Registry API Client
 */

import type {
  ListServersResponse,
  ListServersApiResponse,
  GetServerResponse,
  ListServersOptions,
  GetServerOptions,
} from './types.js';

const API_BASE_URL = 'https://api.pulsemcp.com';
const API_VERSION = 'v0.1';
const DEFAULT_TIMEOUT_MS = 30000;

export interface PulseSubregistryClientConfig {
  apiKey: string;
  tenantId?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface IPulseSubregistryClient {
  listServers(options?: ListServersOptions): Promise<ListServersResponse>;
  getServer(options: GetServerOptions): Promise<GetServerResponse>;
}

export class PulseSubregistryClient implements IPulseSubregistryClient {
  private apiKey: string;
  private tenantId?: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: PulseSubregistryClientConfig) {
    this.apiKey = config.apiKey;
    this.tenantId = config.tenantId;
    this.baseUrl = config.baseUrl || API_BASE_URL;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
  }

  private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${this.timeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
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

    const response = await this.fetchWithTimeout(url, {
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

    // Parse the raw API response
    const apiResponse = (await response.json()) as ListServersApiResponse;

    // Transform to flattened format - extract server objects from nested structure
    return {
      servers: apiResponse.servers.map((entry) => entry.server),
      metadata: apiResponse.metadata,
    };
  }

  async getServer(options: GetServerOptions): Promise<GetServerResponse> {
    const { serverName, version = 'latest' } = options;
    const encodedName = encodeURIComponent(serverName);
    const encodedVersion = encodeURIComponent(version);

    const url = this.buildUrl(`/servers/${encodedName}/versions/${encodedVersion}`);

    const response = await this.fetchWithTimeout(url, {
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

export type ClientFactory = () => IPulseSubregistryClient;
