import type { ObservationView } from '../../types.js';

export async function getObservation(
  baseUrl: string,
  authHeader: string,
  observationId: string
): Promise<ObservationView> {
  const url = `${baseUrl}/api/public/observations/${encodeURIComponent(observationId)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Langfuse API error (${response.status}): ${body}`);
  }

  return response.json() as Promise<ObservationView>;
}
