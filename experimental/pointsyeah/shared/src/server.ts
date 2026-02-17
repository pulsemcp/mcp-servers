import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { getServerState } from './state.js';
import type {
  FlightSearchParams,
  FlightResult,
  FlightSearchResults,
  CognitoTokens,
  ExplorerDetailResponse,
  ExplorerDetailRoute,
  ExplorerDetailSegment,
} from './types.js';
import { refreshCognitoTokens } from './pointsyeah-client/lib/auth.js';
import { explorerSearch, fetchFlightDetail } from './pointsyeah-client/lib/explorer-search.js';
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
// DETAIL RESPONSE NORMALIZATION
// =============================================================================

/**
 * Normalize an explorer detail segment into our standard FlightSegment format.
 */
function normalizeSegment(seg: ExplorerDetailSegment) {
  return {
    duration: seg.duration,
    flight_number: seg.flight.number,
    dt: seg.departure_info.date_time,
    da: seg.departure_info.airport.airport_code,
    at: seg.arrival_info.date_time,
    aa: seg.arrival_info.airport.airport_code,
    cabin: seg.cabin,
  };
}

/**
 * Normalize an explorer detail route into our standard FlightRoute format.
 */
function normalizeRoute(route: ExplorerDetailRoute) {
  return {
    payment: {
      currency: route.payment.currency,
      tax: route.payment.tax,
      miles: route.payment.miles,
      cabin: route.payment.cabin,
      unit: route.payment.unit,
      seats: route.payment.seats,
      cash_price: route.payment.cash_price,
    },
    segments: route.segments.map(normalizeSegment),
    transfer: (route.transfer || []).map((t) => ({
      bank: t.bank,
      actual_points: t.actual_points,
      points: t.points,
    })),
  };
}

/**
 * Convert an explorer detail response into our standard FlightResult format.
 */
function normalizeDetailResponse(detail: ExplorerDetailResponse): FlightResult {
  return {
    program: detail.program,
    code: detail.code,
    date: detail.date,
    departure: detail.departure,
    arrival: detail.arrival,
    routes: detail.routes.map(normalizeRoute),
  };
}

// =============================================================================
// CLIENT IMPLEMENTATION
// =============================================================================

export class PointsYeahClient implements IPointsYeahClient {
  private tokens: CognitoTokens | null = null;
  private refreshPromise: Promise<CognitoTokens> | null = null;

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
    // Step 1: Search the explorer API for matching flights (with 401 retry)
    const searchResponse = await this.withAuth((idToken) => explorerSearch(params, idToken));

    if (!searchResponse.results || searchResponse.results.length === 0) {
      return { total: 0, results: [] };
    }

    // Step 2: Fetch details for each result (contains full route/segment info)
    const MAX_DETAILS = 10; // Limit detail fetches to avoid excessive API calls
    const topResults = searchResponse.results.slice(0, MAX_DETAILS);

    const detailResults: FlightResult[] = [];
    for (const result of topResults) {
      try {
        const detail = await fetchFlightDetail(result.detail_url);
        detailResults.push(normalizeDetailResponse(detail));
      } catch (error) {
        logWarning(
          'search',
          `Failed to fetch detail for ${result.program} ${result.departure.code}->${result.arrival.code}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    return {
      total: searchResponse.total,
      results: detailResults,
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
 * Default client factory that creates a PointsYeahClient reading the token from state.
 */
export function defaultClientFactory(): IPointsYeahClient {
  return new PointsYeahClient();
}
