// Core server exports
export { registerResources } from './resources.js';
export { createRegisterTools, getAllToolNames } from './tools.js';
export {
  createMCPServer,
  GoogleFlightsClient,
  type CreateMCPServerOptions,
  type FlightsClientFactory,
  type IFlightsClient,
} from './server.js';

// Flights client exports
export {
  searchFlights,
  getDateGrid,
  findAirportCode,
  buildTfsParam,
} from './flights-client/flights-client.js';
export type {
  FlightOffer,
  FlightSegment,
  DateGridEntry,
  DateGridResult,
  AirportResult,
  SearchFlightsOptions,
  SearchFlightsResult,
  GetDateGridOptions,
  SeatClass,
  TripType,
} from './flights-client/types.js';

// Logging exports
export { logServerStart, logError, logWarning, logInfo, logDebug } from './logging.js';
