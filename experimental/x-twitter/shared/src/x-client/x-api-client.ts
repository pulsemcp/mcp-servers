/**
 * Client for the X (Twitter) API v2.
 *
 * Wraps an `ITokenProvider` for auth and exposes the endpoints this MCP server
 * surfaces. On a 401 it invalidates the cached access token and retries once —
 * this transparently handles a token that expired mid-session.
 *
 * SAFETY: the only non-GET content requests this client issues are bookmark
 * create (POST) and remove (DELETE), which touch only the authenticated user's
 * PRIVATE bookmark collection. There is no code path here — or anywhere in this
 * server — that performs a PUBLIC mutation (posting, replying, liking,
 * retweeting, following, DMing). The only other POST made by this package is to
 * the OAuth token endpoint (in auth.ts).
 */

import { ITokenProvider } from './auth.js';
import { XApiError } from './api-errors.js';
import { clampMaxResults, tweetQueryParams, userQueryParams } from './query.js';
import type {
  IXClient,
  XBookmarkWriteResponse,
  XListResponse,
  XSingleUserResponse,
  XTweetsLookupResponse,
} from '../types.js';

export const X_API_BASE = 'https://api.x.com/2';

export interface XApiClientConfig {
  tokenProvider: ITokenProvider;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}

export class XApiClient implements IXClient {
  private readonly tokenProvider: ITokenProvider;
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  /** Cached id of the authenticated user (from GET /2/users/me). */
  private meId: string | null = null;

  constructor(config: XApiClientConfig) {
    this.tokenProvider = config.tokenProvider;
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.baseUrl = config.baseUrl ?? X_API_BASE;
  }

  /**
   * Issues an authenticated GET and returns the parsed JSON body. Retries once
   * on 401 after invalidating the cached access token.
   */
  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') url.searchParams.set(key, value);
    }

    let attempt = 0;
    // One initial try + one retry after a forced token refresh.
    for (;;) {
      const token = await this.tokenProvider.getAccessToken();
      const response = await this.fetchImpl(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (response.status === 401 && attempt === 0) {
        attempt += 1;
        this.tokenProvider.invalidate();
        continue;
      }

      const text = await response.text();

      if (!response.ok) {
        throw new XApiError(response.status, text);
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new XApiError(response.status, text, 'X API returned a non-JSON success response');
      }
    }
  }

  /**
   * Issues an authenticated POST/DELETE and returns the parsed JSON body.
   * Mirrors `get`'s 401 invalidate-and-retry-once behaviour. Used only for the
   * private bookmark write endpoints.
   */
  private async send<T>(method: 'POST' | 'DELETE', path: string, jsonBody?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let attempt = 0;
    for (;;) {
      const token = await this.tokenProvider.getAccessToken();
      const response = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(jsonBody !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(jsonBody !== undefined ? { body: JSON.stringify(jsonBody) } : {}),
      });

      if (response.status === 401 && attempt === 0) {
        attempt += 1;
        this.tokenProvider.invalidate();
        continue;
      }

      const text = await response.text();

      if (!response.ok) {
        throw new XApiError(response.status, text);
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        throw new XApiError(response.status, text, 'X API returned a non-JSON success response');
      }
    }
  }

  async getMe(): Promise<XSingleUserResponse> {
    const result = await this.get<XSingleUserResponse>('/users/me', userQueryParams());
    if (result.data?.id) {
      this.meId = result.data.id;
    }
    return result;
  }

  async getUserByUsername(username: string): Promise<XSingleUserResponse> {
    const handle = username.replace(/^@/, '');
    return this.get<XSingleUserResponse>(
      `/users/by/username/${encodeURIComponent(handle)}`,
      userQueryParams()
    );
  }

  /** Resolves and caches the authenticated user's id for `/users/:id/...`. */
  private async resolveMeId(): Promise<string> {
    if (this.meId) return this.meId;
    const me = await this.getMe();
    if (!me.data?.id) {
      throw new XApiError(
        200,
        JSON.stringify(me),
        'Could not resolve the authenticated user id from GET /2/users/me'
      );
    }
    return me.data.id;
  }

  async getHomeTimeline(params: {
    maxResults?: number;
    paginationToken?: string;
  }): Promise<XListResponse> {
    const id = await this.resolveMeId();
    return this.get<XListResponse>(`/users/${id}/timelines/reverse_chronological`, {
      ...tweetQueryParams(),
      max_results: String(clampMaxResults(params.maxResults, 20)),
      ...(params.paginationToken ? { pagination_token: params.paginationToken } : {}),
    });
  }

  async getBookmarks(params: {
    maxResults?: number;
    paginationToken?: string;
  }): Promise<XListResponse> {
    const id = await this.resolveMeId();
    return this.get<XListResponse>(`/users/${id}/bookmarks`, {
      ...tweetQueryParams(),
      max_results: String(clampMaxResults(params.maxResults, 20)),
      ...(params.paginationToken ? { pagination_token: params.paginationToken } : {}),
    });
  }

  async searchRecent(params: {
    query: string;
    maxResults?: number;
    paginationToken?: string;
  }): Promise<XListResponse> {
    return this.get<XListResponse>('/tweets/search/recent', {
      ...tweetQueryParams(),
      query: params.query,
      max_results: String(clampMaxResults(params.maxResults, 20, 10)),
      ...(params.paginationToken ? { next_token: params.paginationToken } : {}),
    });
  }

  async getTweets(ids: string[]): Promise<XTweetsLookupResponse> {
    return this.get<XTweetsLookupResponse>('/tweets', {
      ...tweetQueryParams(),
      ids: ids.join(','),
    });
  }

  /**
   * Resolves a user id from an optional handle. Omitting `username` resolves
   * the authenticated user (cached).
   */
  private async resolveUserId(username?: string): Promise<string> {
    if (!username) return this.resolveMeId();
    const handle = username.replace(/^@/, '');
    const user = await this.getUserByUsername(handle);
    if (!user.data?.id) {
      throw new XApiError(
        200,
        JSON.stringify(user),
        `Could not resolve a user id for "@${handle}"`
      );
    }
    return user.data.id;
  }

  async getUserTweets(params: {
    username?: string;
    maxResults?: number;
    paginationToken?: string;
    excludeReplies?: boolean;
    excludeRetweets?: boolean;
  }): Promise<XListResponse> {
    const id = await this.resolveUserId(params.username);
    const exclude = [
      params.excludeReplies ? 'replies' : null,
      params.excludeRetweets ? 'retweets' : null,
    ].filter((v): v is string => v !== null);
    return this.get<XListResponse>(`/users/${id}/tweets`, {
      ...tweetQueryParams(),
      max_results: String(clampMaxResults(params.maxResults, 20)),
      ...(exclude.length ? { exclude: exclude.join(',') } : {}),
      ...(params.paginationToken ? { pagination_token: params.paginationToken } : {}),
    });
  }

  async createBookmark(tweetId: string): Promise<XBookmarkWriteResponse> {
    const id = await this.resolveMeId();
    return this.send<XBookmarkWriteResponse>('POST', `/users/${id}/bookmarks`, {
      tweet_id: tweetId,
    });
  }

  async removeBookmark(tweetId: string): Promise<XBookmarkWriteResponse> {
    const id = await this.resolveMeId();
    return this.send<XBookmarkWriteResponse>(
      'DELETE',
      `/users/${id}/bookmarks/${encodeURIComponent(tweetId)}`
    );
  }
}
