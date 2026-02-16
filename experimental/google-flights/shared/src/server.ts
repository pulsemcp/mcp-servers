import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { searchFlights, getDateGrid, findAirportCode } from './flights-client/flights-client.js';
import type {
  SearchFlightsOptions,
  SearchFlightsResult,
  GetDateGridOptions,
  DateGridResult,
  AirportResult,
} from './flights-client/types.js';

export interface IFlightsClient {
  searchFlights(options: SearchFlightsOptions): Promise<SearchFlightsResult>;
  getDateGrid(options: GetDateGridOptions): Promise<DateGridResult>;
  findAirportCode(query: string): Promise<AirportResult[]>;
}

export type FlightsClientFactory = () => IFlightsClient;

export class GoogleFlightsClient implements IFlightsClient {
  async searchFlights(options: SearchFlightsOptions): Promise<SearchFlightsResult> {
    return searchFlights(options);
  }

  async getDateGrid(options: GetDateGridOptions): Promise<DateGridResult> {
    return getDateGrid(options);
  }

  async findAirportCode(query: string): Promise<AirportResult[]> {
    return findAirportCode(query);
  }
}

export interface CreateMCPServerOptions {
  version: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'google-flights-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: FlightsClientFactory) => {
    const factory = clientFactory || (() => new GoogleFlightsClient());

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
