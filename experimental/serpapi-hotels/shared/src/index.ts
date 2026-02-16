export { registerResources } from './resources.js';
export { createRegisterTools, getAllToolNames } from './tools.js';
export {
  createMCPServer,
  SerpApiClient,
  type CreateMCPServerOptions,
  type SerpApiClientFactory,
  type ISerpApiClient,
} from './server.js';

export { searchHotels } from './serpapi-client/lib/search-hotels.js';
export { getHotelDetails } from './serpapi-client/lib/get-hotel-details.js';

export type {
  HotelProperty,
  HotelPrice,
  NearbyPlace,
  ReviewsBreakdown,
  SearchHotelsOptions,
  SearchHotelsResult,
  GetHotelDetailsOptions,
  HotelDetailsResult,
  HotelBrand,
} from './types.js';

export { logServerStart, logError } from './logging.js';
