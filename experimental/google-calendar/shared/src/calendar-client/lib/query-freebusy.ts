import type { FreeBusyRequest, FreeBusyResponse } from '../../types.js';
import { handleApiError } from './api-errors.js';

export async function queryFreebusy(
  baseUrl: string,
  headers: Record<string, string>,
  request: FreeBusyRequest
): Promise<FreeBusyResponse> {
  const url = `${baseUrl}/freeBusy`;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    handleApiError(response.status, 'querying freebusy information');
  }

  return (await response.json()) as FreeBusyResponse;
}
