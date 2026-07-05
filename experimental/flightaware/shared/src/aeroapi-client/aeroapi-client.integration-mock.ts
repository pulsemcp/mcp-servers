import type { IAeroApiClient } from '../server.js';
import type { SearchFlightsByIdentOptions } from './lib/search-flights-by-ident.js';
import type { GetFlightTrackOptions } from './lib/get-flight-track.js';
import type { GetAirportInfoOptions } from './lib/get-airport-info.js';
import type { GetAirportFlightsOptions } from './lib/get-airport-flights.js';
import type { GetAirportDelaysOptions } from './lib/get-airport-delays.js';
import type {
  Flight,
  FlightsResult,
  FlightTrackResult,
  AirportInfo,
  AirportFlightsResult,
  AirportDelaysResult,
} from '../types.js';

interface MockData {
  flightsByIdent?: Record<string, FlightsResult>;
  flightTracks?: Record<string, FlightTrackResult>;
  airportInfo?: Record<string, AirportInfo>;
  airportFlights?: Record<string, AirportFlightsResult>;
  airportDelays?: Record<string, AirportDelaysResult>;
}

/**
 * Builds a fully in-memory IAeroApiClient with realistic canned data for every
 * tool, used by the integration test entry point. No HTTP requests are made —
 * this mocks the AeroAPI boundary so the full MCP protocol flow can be exercised
 * without live credentials. Per-method overrides can be supplied via mockData.
 */
export function createIntegrationMockAeroApiClient(mockData: MockData = {}): IAeroApiClient & {
  mockData: MockData;
} {
  const defaultOrigin = {
    code: 'KSFO',
    code_icao: 'KSFO',
    code_iata: 'SFO',
    code_lid: 'SFO',
    airport_info_url: '/airports/KSFO',
    city: 'San Francisco',
    name: 'San Francisco Intl',
  };

  const defaultDestination = {
    code: 'KJFK',
    code_icao: 'KJFK',
    code_iata: 'JFK',
    code_lid: 'JFK',
    airport_info_url: '/airports/KJFK',
    city: 'New York',
    name: 'John F Kennedy Intl',
  };

  const defaultFlight: Flight = {
    ident: 'UAL123',
    ident_icao: 'UAL123',
    ident_iata: 'UA123',
    fa_flight_id: 'UAL123-1234567890-airline-0001',
    operator: 'UAL',
    operator_icao: 'UAL',
    operator_iata: 'UA',
    flight_number: '123',
    registration: 'N12345',
    atc_ident: null,
    inbound_fa_flight_id: null,
    codeshares: [],
    blocked: false,
    diverted: false,
    cancelled: false,
    position_only: false,
    origin: defaultOrigin,
    destination: defaultDestination,
    departure_delay: 0,
    arrival_delay: 600,
    filed_ete: 19800,
    scheduled_out: '2026-06-30T15:00:00Z',
    estimated_out: '2026-06-30T15:00:00Z',
    actual_out: '2026-06-30T15:02:00Z',
    scheduled_off: '2026-06-30T15:15:00Z',
    estimated_off: '2026-06-30T15:15:00Z',
    actual_off: '2026-06-30T15:17:00Z',
    scheduled_on: '2026-06-30T20:30:00Z',
    estimated_on: '2026-06-30T20:40:00Z',
    actual_on: null,
    scheduled_in: '2026-06-30T20:45:00Z',
    estimated_in: '2026-06-30T20:55:00Z',
    actual_in: null,
    progress_percent: 65,
    status: 'En Route / On Time',
    aircraft_type: 'B739',
    route_distance: 2586,
    gate_origin: 'F12',
    gate_destination: 'B22',
    terminal_origin: '3',
    terminal_destination: '4',
  };

  const defaultFlightsResult: FlightsResult = {
    flights: [defaultFlight],
    links: null,
    num_pages: 1,
  };

  const defaultFlightTrackResult: FlightTrackResult = {
    actual_distance: 1680,
    positions: [
      {
        fa_flight_id: 'UAL123-1234567890-airline-0001',
        altitude: 350,
        altitude_change: 'C',
        groundspeed: 478,
        heading: 78,
        latitude: 37.6188,
        longitude: -122.3756,
        timestamp: '2026-06-30T15:20:00Z',
        update_type: 'A',
      },
      {
        fa_flight_id: 'UAL123-1234567890-airline-0001',
        altitude: 360,
        altitude_change: 'L',
        groundspeed: 502,
        heading: 80,
        latitude: 39.1234,
        longitude: -110.5432,
        timestamp: '2026-06-30T16:20:00Z',
        update_type: 'A',
      },
    ],
  };

  const defaultAirportInfo: AirportInfo = {
    airport_code: 'KSFO',
    code_icao: 'KSFO',
    code_iata: 'SFO',
    code_lid: 'SFO',
    name: 'San Francisco International Airport',
    type: 'Airport',
    elevation: 13,
    city: 'San Francisco',
    state: 'CA',
    longitude: -122.375,
    latitude: 37.6189,
    timezone: 'America/Los_Angeles',
    country_code: 'US',
    wiki_url: 'https://en.wikipedia.org/wiki/San_Francisco_International_Airport',
    airport_flights_url: '/airports/KSFO/flights',
  };

  const defaultAirportFlightsResult: AirportFlightsResult = {
    scheduled_arrivals: [defaultFlight],
    scheduled_departures: [defaultFlight],
    arrivals: [defaultFlight],
    departures: [defaultFlight],
    links: null,
    num_pages: 1,
  };

  const defaultAirportDelaysResult: AirportDelaysResult = {
    airport: 'KSFO',
    reasons: [
      {
        category: 'weather',
        color: 'yellow',
        delay_secs: 2700,
        reason: 'Low ceilings',
      },
    ],
    category: 'weather',
    color: 'yellow',
    delay_secs: 2700,
  };

  return {
    mockData,

    async searchFlightsByIdent(options: SearchFlightsByIdentOptions): Promise<FlightsResult> {
      if (mockData.flightsByIdent?.[options.ident]) {
        return mockData.flightsByIdent[options.ident];
      }
      return {
        ...defaultFlightsResult,
        flights: defaultFlightsResult.flights.map((f) => ({ ...f, ident: options.ident })),
      };
    },

    async getFlightTrack(options: GetFlightTrackOptions): Promise<FlightTrackResult> {
      if (mockData.flightTracks?.[options.fa_flight_id]) {
        return mockData.flightTracks[options.fa_flight_id];
      }
      return defaultFlightTrackResult;
    },

    async getAirportInfo(options: GetAirportInfoOptions): Promise<AirportInfo> {
      if (mockData.airportInfo?.[options.id]) {
        return mockData.airportInfo[options.id];
      }
      return { ...defaultAirportInfo, airport_code: options.id };
    },

    async getAirportFlights(options: GetAirportFlightsOptions): Promise<AirportFlightsResult> {
      if (mockData.airportFlights?.[options.id]) {
        return mockData.airportFlights[options.id];
      }
      return defaultAirportFlightsResult;
    },

    async getAirportDelays(options: GetAirportDelaysOptions): Promise<AirportDelaysResult> {
      if (mockData.airportDelays?.[options.id]) {
        return mockData.airportDelays[options.id];
      }
      return { ...defaultAirportDelaysResult, airport: options.id };
    },
  };
}
