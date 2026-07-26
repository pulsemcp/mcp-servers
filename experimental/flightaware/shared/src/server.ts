import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { searchFlightsByIdent } from './aeroapi-client/lib/search-flights-by-ident.js';
import { getFlightTrack } from './aeroapi-client/lib/get-flight-track.js';
import { getAirportInfo } from './aeroapi-client/lib/get-airport-info.js';
import { getAirportFlights } from './aeroapi-client/lib/get-airport-flights.js';
import { getAirportDelays } from './aeroapi-client/lib/get-airport-delays.js';
import type { SearchFlightsByIdentOptions } from './aeroapi-client/lib/search-flights-by-ident.js';
import type { GetFlightTrackOptions } from './aeroapi-client/lib/get-flight-track.js';
import type { GetAirportInfoOptions } from './aeroapi-client/lib/get-airport-info.js';
import type { GetAirportFlightsOptions } from './aeroapi-client/lib/get-airport-flights.js';
import type { GetAirportDelaysOptions } from './aeroapi-client/lib/get-airport-delays.js';
import type {
  FlightsResult,
  FlightTrackResult,
  AirportInfo,
  AirportFlightsResult,
  AirportDelaysResult,
} from './types.js';

export interface IAeroApiClient {
  searchFlightsByIdent(options: SearchFlightsByIdentOptions): Promise<FlightsResult>;
  getFlightTrack(options: GetFlightTrackOptions): Promise<FlightTrackResult>;
  getAirportInfo(options: GetAirportInfoOptions): Promise<AirportInfo>;
  getAirportFlights(options: GetAirportFlightsOptions): Promise<AirportFlightsResult>;
  getAirportDelays(options: GetAirportDelaysOptions): Promise<AirportDelaysResult>;
}

export type AeroApiClientFactory = () => IAeroApiClient;

export class AeroApiClient implements IAeroApiClient {
  constructor(private apiKey: string) {}

  async searchFlightsByIdent(options: SearchFlightsByIdentOptions): Promise<FlightsResult> {
    return searchFlightsByIdent(this.apiKey, options);
  }

  async getFlightTrack(options: GetFlightTrackOptions): Promise<FlightTrackResult> {
    return getFlightTrack(this.apiKey, options);
  }

  async getAirportInfo(options: GetAirportInfoOptions): Promise<AirportInfo> {
    return getAirportInfo(this.apiKey, options);
  }

  async getAirportFlights(options: GetAirportFlightsOptions): Promise<AirportFlightsResult> {
    return getAirportFlights(this.apiKey, options);
  }

  async getAirportDelays(options: GetAirportDelaysOptions): Promise<AirportDelaysResult> {
    return getAirportDelays(this.apiKey, options);
  }
}

export interface CreateMCPServerOptions {
  version: string;
  apiKey?: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'flightaware-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: AeroApiClientFactory) => {
    const factory =
      clientFactory ||
      (() => {
        const apiKey = options.apiKey || process.env.AEROAPI_API_KEY;
        if (!apiKey) {
          throw new Error('AEROAPI_API_KEY environment variable is required');
        }
        return new AeroApiClient(apiKey);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
