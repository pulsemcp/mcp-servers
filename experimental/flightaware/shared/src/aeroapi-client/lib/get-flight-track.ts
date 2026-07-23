import { aeroApiRequest } from '../request.js';
import type { FlightTrackResult } from '../../types.js';

export interface GetFlightTrackOptions {
  fa_flight_id: string;
  include_estimated_positions?: boolean;
}

/**
 * GET /flights/{id}/track — the recorded position track for a single flight.
 * `fa_flight_id` is obtained from a search_flights_by_ident result.
 */
export async function getFlightTrack(
  apiKey: string,
  options: GetFlightTrackOptions
): Promise<FlightTrackResult> {
  const { fa_flight_id, include_estimated_positions } = options;
  return aeroApiRequest<FlightTrackResult>(
    apiKey,
    `/flights/${encodeURIComponent(fa_flight_id)}/track`,
    {
      query: { include_estimated_positions },
    }
  );
}
