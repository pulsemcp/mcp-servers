import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { getServerState } from './state.js';
import type {
  FlightSearchParams,
  FlightSearchResponse,
  FlightSearchResults,
  CognitoTokens,
} from './types.js';
import { refreshCognitoTokens } from './pointsyeah-client/lib/auth.js';
import { createSearchTask } from './pointsyeah-client/lib/search.js';
import type { PlaywrightSearchDeps } from './pointsyeah-client/lib/search.js';
import { fetchSearchResults } from './pointsyeah-client/lib/fetch-results.js';
import { getSearchHistory } from './pointsyeah-client/lib/user-api.js';
import { logDebug, logWarning } from './logging.js';

// =============================================================================
// CLIENT INTERFACE
// =============================================================================

export interface IPointsYeahClient {
  searchFlights(params: FlightSearchParams): Promise<FlightSearchResults>;
  getSearchHistory(): Promise<unknown>;
}

// =============================================================================
// CLIENT IMPLEMENTATION
// =============================================================================

export class PointsYeahClient implements IPointsYeahClient {
  private tokens: CognitoTokens | null = null;
  private refreshPromise: Promise<CognitoTokens> | null = null;
  private playwright: PlaywrightSearchDeps;

  constructor(playwright: PlaywrightSearchDeps) {
    this.playwright = playwright;
  }

  private get refreshToken(): string {
    const { refreshToken } = getServerState();
    if (!refreshToken) {
      throw new Error(
        'Refresh token expired or revoked. Please re-login to PointsYeah and update POINTSYEAH_REFRESH_TOKEN.'
      );
    }
    return refreshToken;
  }

  /**
   * Ensure we have valid tokens, refreshing if needed.
   * Uses a mutex (refreshPromise) to prevent concurrent refresh calls.
   */
  private async ensureTokens(): Promise<CognitoTokens> {
    const now = Math.floor(Date.now() / 1000);
    const REFRESH_BUFFER = 5 * 60; // 5 minutes

    if (!this.tokens || this.tokens.expiresAt - now < REFRESH_BUFFER) {
      if (!this.refreshPromise) {
        logDebug('client', 'Tokens expired or expiring soon, refreshing...');
        this.refreshPromise = refreshCognitoTokens(this.refreshToken)
          .then((tokens) => {
            this.tokens = tokens;
            this.refreshPromise = null;
            return tokens;
          })
          .catch((err) => {
            this.refreshPromise = null;
            throw err;
          });
      }
      return this.refreshPromise;
    }

    return this.tokens;
  }

  /**
   * Make an API call with automatic token refresh on 401.
   */
  private async withAuth<T>(fn: (idToken: string) => Promise<T>): Promise<T> {
    const tokens = await this.ensureTokens();
    try {
      return await fn(tokens.idToken);
    } catch (error) {
      // If we get a 401, force a token refresh and retry once
      if (error instanceof Error && error.message.includes('401')) {
        logWarning('client', 'Got 401, refreshing tokens and retrying...');
        this.tokens = null;
        this.refreshPromise = null;
        const freshTokens = await this.ensureTokens();
        return await fn(freshTokens.idToken);
      }
      throw error;
    }
  }

  async searchFlights(params: FlightSearchParams): Promise<FlightSearchResults> {
    const tokens = await this.ensureTokens();

    // Step 1: Create search task via Playwright (handles encrypted request)
    const task = await createSearchTask(
      params,
      tokens.accessToken,
      tokens.idToken,
      this.refreshToken,
      this.playwright
    );

    // Step 2: Poll for results until all sub-tasks complete
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLLS = 120; // Up to 6 minutes of polling
    let lastResults: FlightSearchResponse | null = null;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      lastResults = await this.withAuth((idToken) => fetchSearchResults(task.task_id, idToken));

      if (!lastResults.success) {
        throw new Error(`Search polling failed (code: ${lastResults.code})`);
      }

      logDebug(
        'search',
        `Poll ${i + 1}: ${lastResults.data.completed_sub_tasks}/${lastResults.data.total_sub_tasks} sub-tasks complete, ${lastResults.data.result.length} results`
      );

      if (lastResults.data.completed_sub_tasks >= lastResults.data.total_sub_tasks) {
        break;
      }
    }

    if (!lastResults) {
      throw new Error('No results received from search');
    }

    if (lastResults.data.completed_sub_tasks < lastResults.data.total_sub_tasks) {
      logWarning(
        'search',
        `Search timed out: ${lastResults.data.completed_sub_tasks}/${lastResults.data.total_sub_tasks} sub-tasks complete`
      );
    }

    return {
      total: lastResults.data.result.length,
      results: lastResults.data.result,
    };
  }

  async getSearchHistory(): Promise<unknown> {
    return this.withAuth((idToken) => getSearchHistory(idToken));
  }
}

// =============================================================================
// SERVER FACTORY
// =============================================================================

export type ClientFactory = () => IPointsYeahClient;

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'pointsyeah-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory: ClientFactory) => {
    registerResources(server, options.version);
    const registerTools = createRegisterTools(clientFactory);
    registerTools(server);
  };

  return { server, registerHandlers };
}

/**
 * Default client factory that creates a PointsYeahClient with Playwright support.
 * Playwright is loaded dynamically to avoid import-time errors in environments
 * where it may not be installed.
 */
export function defaultClientFactory(): IPointsYeahClient {
  const playwrightDeps: PlaywrightSearchDeps = {
    launchBrowser: async () => {
      const { chromium } = await import('playwright');
      const browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      return {
        addCookies: (cookies) => context.addCookies(cookies),
        newPage: async () => {
          const page = await context.newPage();
          return {
            goto: (url: string, options?: { waitUntil?: string; timeout?: number }) =>
              page.goto(url, options as Parameters<typeof page.goto>[1]).then(() => {}),
            waitForResponse: (
              predicate: (response: { url: () => string; json: () => Promise<unknown> }) => boolean,
              options?: { timeout?: number }
            ) =>
              page
                .waitForResponse((res) => predicate(res), options)
                .then((res) => ({
                  url: () => res.url(),
                  json: () => res.json(),
                })),
            close: () => page.close(),
          };
        },
        close: async () => {
          await context.close();
          await browser.close();
        },
      };
    },
  };

  return new PointsYeahClient(playwrightDeps);
}
