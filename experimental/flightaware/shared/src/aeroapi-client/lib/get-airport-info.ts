import { aeroApiRequest } from '../request.js';
import type { AirportInfo } from '../../types.js';

export interface GetAirportInfoOptions {
  id: string;
}

/**
 * GET /airports/{id} — general information about an airport, identified by
 * ICAO, IATA, or LID code.
 */
export async function getAirportInfo(
  apiKey: string,
  options: GetAirportInfoOptions
): Promise<AirportInfo> {
  return aeroApiRequest<AirportInfo>(apiKey, `/airports/${encodeURIComponent(options.id)}`);
}
