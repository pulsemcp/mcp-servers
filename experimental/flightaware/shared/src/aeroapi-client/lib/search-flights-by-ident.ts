import { aeroApiRequest } from '../request.js';
import type { FlightsResult } from '../../types.js';

export interface SearchFlightsByIdentOptions {
  ident: string;
  ident_type?: 'designator' | 'registration' | 'fa_flight_id';
  start?: string;
  end?: string;
  max_pages?: number;
}

/**
 * GET /flights/{ident} — look up flights and their status by flight number,
 * registration, or fa_flight_id.
 */
export async function searchFlightsByIdent(
  apiKey: string,
  options: SearchFlightsByIdentOptions
): Promise<FlightsResult> {
  const { ident, ident_type, start, end, max_pages } = options;
  return aeroApiRequest<FlightsResult>(apiKey, `/flights/${encodeURIComponent(ident)}`, {
    query: { ident_type, start, end, max_pages },
  });
}
