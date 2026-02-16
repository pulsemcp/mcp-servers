import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { registerResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { searchHotels } from './serpapi-client/lib/search-hotels.js';
import { getHotelDetails } from './serpapi-client/lib/get-hotel-details.js';
import { getHotelReviews } from './serpapi-client/lib/get-hotel-reviews.js';
import type {
  SearchHotelsOptions,
  SearchHotelsResult,
  GetHotelDetailsOptions,
  HotelDetailsResult,
  GetHotelReviewsOptions,
  HotelReviewsResult,
} from './types.js';

export interface ISerpApiClient {
  searchHotels(options: SearchHotelsOptions): Promise<SearchHotelsResult>;
  getHotelDetails(options: GetHotelDetailsOptions): Promise<HotelDetailsResult>;
  getHotelReviews(options: GetHotelReviewsOptions): Promise<HotelReviewsResult>;
}

export type SerpApiClientFactory = () => ISerpApiClient;

export class SerpApiClient implements ISerpApiClient {
  constructor(private apiKey: string) {}

  async searchHotels(options: SearchHotelsOptions): Promise<SearchHotelsResult> {
    return searchHotels(this.apiKey, options);
  }

  async getHotelDetails(options: GetHotelDetailsOptions): Promise<HotelDetailsResult> {
    return getHotelDetails(this.apiKey, options);
  }

  async getHotelReviews(options: GetHotelReviewsOptions): Promise<HotelReviewsResult> {
    return getHotelReviews(this.apiKey, options);
  }
}

export interface CreateMCPServerOptions {
  version: string;
  apiKey?: string;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'serpapi-hotels-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: SerpApiClientFactory) => {
    const factory =
      clientFactory ||
      (() => {
        const apiKey = options.apiKey || process.env.SERPAPI_API_KEY;
        if (!apiKey) {
          throw new Error('SERPAPI_API_KEY environment variable is required');
        }
        return new SerpApiClient(apiKey);
      });

    registerResources(server);
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
