import { aeroApiRequest } from '../request.js';
import type { AirportFlightsResult } from '../../types.js';

export interface GetAirportFlightsOptions {
  id: string;
  type?: 'Airline' | 'GeneralAviation';
  start?: string;
  end?: string;
  max_pages?: number;
}

/**
 * GET /airports/{id}/flights — the arrivals, departures, scheduled arrivals,
 * and scheduled departures board for an airport.
 */
export async function getAirportFlights(
  apiKey: string,
  options: GetAirportFlightsOptions
): Promise<AirportFlightsResult> {
  const { id, type, start, end, max_pages } = options;
  return aeroApiRequest<AirportFlightsResult>(
    apiKey,
    `/airports/${encodeURIComponent(id)}/flights`,
    {
      query: { type, start, end, max_pages },
    }
  );
}
