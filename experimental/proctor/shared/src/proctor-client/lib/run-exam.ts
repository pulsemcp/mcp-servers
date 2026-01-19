import type { RunExamParams, ExamStreamEntry } from '../../types.js';

/**
 * Run a Proctor exam against an MCP server.
 * Returns an async generator that yields NDJSON stream entries.
 */
export async function* runExam(
  apiKey: string,
  baseUrl: string,
  params: RunExamParams
): AsyncGenerator<ExamStreamEntry, void, unknown> {
  const url = new URL('/api/proctor/run_exam', baseUrl);

  const body: Record<string, unknown> = {
    runtime_id: params.runtime_id,
    exam_id: params.exam_id,
    mcp_config: params.mcp_json,
  };

  if (params.server_json) {
    body.server_json = params.server_json;
  }
  if (params.custom_runtime_image) {
    body.custom_runtime_image = params.custom_runtime_image;
  }
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
      throw new Error('User lacks admin privileges or insufficient permissions');
    }
    if (response.status === 422) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(`Validation error: ${errorData.error || 'Unknown validation error'}`);
    }
    throw new Error(`Failed to run exam: ${response.status} ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error('No response body received');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining data in buffer
        if (buffer.trim()) {
          try {
            yield JSON.parse(buffer.trim()) as ExamStreamEntry;
          } catch {
            // Ignore parse errors for incomplete data
          }
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines (NDJSON format)
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed) {
          try {
            yield JSON.parse(trimmed) as ExamStreamEntry;
          } catch {
            // Skip malformed lines
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
