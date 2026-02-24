import type {
  ProctorExamStreamLine,
  ProctorRunExamParams,
  ProctorRunExamResponse,
} from '../../types.js';

export async function runExamForMirror(
  apiKey: string,
  baseUrl: string,
  params: ProctorRunExamParams
): Promise<ProctorRunExamResponse> {
  const url = new URL('/api/proctor/run_exam_for_mirror', baseUrl);

  const body: Record<string, unknown> = {
    mirror_ids: params.mirror_ids,
    runtime_id: params.runtime_id,
    exam_type: params.exam_type,
  };

  if (params.max_retries !== undefined) {
    body.max_retries = params.max_retries;
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid API key');
    }
    if (response.status === 403) {
      throw new Error('User lacks admin privileges');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Validation failed: ${errorData.error || 'Unknown error'}`);
    }
    throw new Error(`Failed to run proctor exam: ${response.status} ${response.statusText}`);
  }

  // Parse NDJSON response - each line is a separate JSON object
  const text = await response.text();
  const lines: ProctorExamStreamLine[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (trimmed) {
      try {
        lines.push(JSON.parse(trimmed) as ProctorExamStreamLine);
      } catch {
        // Include malformed lines as error entries so they're visible in output
        lines.push({ type: 'error', message: `Malformed NDJSON line: ${trimmed}` });
      }
    }
  }

  return { lines };
}
