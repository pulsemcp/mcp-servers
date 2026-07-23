/**
 * TypeScript types for FlightAware AeroAPI v4 responses.
 *
 * These interfaces capture the documented top-level shape of the AeroAPI
 * responses the tools surface. AeroAPI returns rich nested objects; the
 * commonly-used fields are typed here and the parsed JSON is passed through
 * to the caller. See https://www.flightaware.com/aeroapi/portal/documentation
 */

/** A compact airport reference embedded in a Flight object. */
export interface AirportRef {
  code: string | null;
  code_icao: string | null;
  code_iata: string | null;
  code_lid: string | null;
  airport_info_url: string | null;
  city?: string | null;
  name?: string | null;
}

/** A single flight (operation) as returned by the /flights and /airports boards. */
export interface Flight {
  ident: string;
  ident_icao: string | null;
  ident_iata: string | null;
  fa_flight_id: string | null;
  operator: string | null;
  operator_icao: string | null;
  operator_iata: string | null;
  flight_number: string | null;
  registration: string | null;
  atc_ident: string | null;
  inbound_fa_flight_id: string | null;
  codeshares: string[];
  blocked: boolean;
  diverted: boolean;
  cancelled: boolean;
  position_only: boolean;
  origin: AirportRef | null;
  destination: AirportRef | null;
  departure_delay: number | null;
  arrival_delay: number | null;
  filed_ete: number | null;
  scheduled_out: string | null;
  estimated_out: string | null;
  actual_out: string | null;
  scheduled_off: string | null;
  estimated_off: string | null;
  actual_off: string | null;
  scheduled_on: string | null;
  estimated_on: string | null;
  actual_on: string | null;
  scheduled_in: string | null;
  estimated_in: string | null;
  actual_in: string | null;
  progress_percent: number | null;
  status: string | null;
  aircraft_type: string | null;
  route_distance: number | null;
  gate_origin: string | null;
  gate_destination: string | null;
  terminal_origin: string | null;
  terminal_destination: string | null;
}

/** Response from GET /flights/{ident}. */
export interface FlightsResult {
  flights: Flight[];
  links: { next?: string } | null;
  num_pages: number;
}

/** Response from GET /airports/{id}/flights. */
export interface AirportFlightsResult {
  scheduled_arrivals: Flight[];
  scheduled_departures: Flight[];
  arrivals: Flight[];
  departures: Flight[];
  links: { next?: string } | null;
  num_pages: number;
}

/** A single position fix in a flight track. */
export interface FlightPosition {
  fa_flight_id?: string | null;
  altitude: number | null;
  altitude_change: string | null;
  groundspeed: number | null;
  heading: number | null;
  latitude: number;
  longitude: number;
  timestamp: string;
  update_type: string | null;
}

/** Response from GET /flights/{id}/track. */
export interface FlightTrackResult {
  actual_distance: number | null;
  positions: FlightPosition[];
}

/** Response from GET /airports/{id}. */
export interface AirportInfo {
  airport_code: string;
  code_icao: string | null;
  code_iata: string | null;
  code_lid: string | null;
  name: string;
  type: string | null;
  elevation: number | null;
  city: string | null;
  state: string | null;
  longitude: number | null;
  latitude: number | null;
  timezone: string | null;
  country_code: string | null;
  wiki_url: string | null;
  airport_flights_url?: string | null;
}

/** A single delay reason category for an airport. */
export interface AirportDelayReason {
  category: string;
  color: string;
  delay_secs: number;
  reason: string;
}

/** Response from GET /airports/{id}/delays. */
export interface AirportDelaysResult {
  airport: string | null;
  reasons: AirportDelayReason[];
  category: string | null;
  color: string | null;
  delay_secs: number | null;
}
