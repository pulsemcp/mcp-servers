import type { CancelExamParams, CancelExamResponse } from '../../types.js';

/**
 * Cancel a running exam
 */
export async function cancelExam(
  apiKey: string,
  baseUrl: string,
  params: CancelExamParams
): Promise<CancelExamResponse> {
  const url = new URL('/api/proctor/cancel_exam', baseUrl);

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      machine_id: params.machine_id,
      exam_id: params.exam_id,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges or insufficient permissions');
    }
    if (response.status === 400) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Bad request: ${errorData.error || 'Invalid parameters'}`);
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Service error: ${errorData.error || 'Unknown error'}`);
    }
    throw new Error(`Failed to cancel exam: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as CancelExamResponse;
}
