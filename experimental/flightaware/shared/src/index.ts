export { registerResources } from './resources.js';
export { createRegisterTools, getAllToolNames } from './tools.js';
export {
  createMCPServer,
  AeroApiClient,
  type CreateMCPServerOptions,
  type AeroApiClientFactory,
  type IAeroApiClient,
} from './server.js';

export { searchFlightsByIdent } from './aeroapi-client/lib/search-flights-by-ident.js';
export { getFlightTrack } from './aeroapi-client/lib/get-flight-track.js';
export { getAirportInfo } from './aeroapi-client/lib/get-airport-info.js';
export { getAirportFlights } from './aeroapi-client/lib/get-airport-flights.js';
export { getAirportDelays } from './aeroapi-client/lib/get-airport-delays.js';
export { aeroApiRequest, AEROAPI_BASE_URL } from './aeroapi-client/request.js';

export type { SearchFlightsByIdentOptions } from './aeroapi-client/lib/search-flights-by-ident.js';
export type { GetFlightTrackOptions } from './aeroapi-client/lib/get-flight-track.js';
export type { GetAirportInfoOptions } from './aeroapi-client/lib/get-airport-info.js';
export type { GetAirportFlightsOptions } from './aeroapi-client/lib/get-airport-flights.js';
export type { GetAirportDelaysOptions } from './aeroapi-client/lib/get-airport-delays.js';

export type {
  AirportRef,
  Flight,
  FlightsResult,
  AirportFlightsResult,
  FlightPosition,
  FlightTrackResult,
  AirportInfo,
  AirportDelayReason,
  AirportDelaysResult,
} from './types.js';

export { logServerStart, logError } from './logging.js';
