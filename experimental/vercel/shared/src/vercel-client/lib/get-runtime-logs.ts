import type { RuntimeLogEntry } from '../../types.js';
import { logWarning } from '../../logging.js';

export interface GetRuntimeLogsOptions {
  since?: number;
  until?: number;
  limit?: number;
  direction?: 'forward' | 'backward';
  search?: string;
  source?: string;
  level?: string;
  statusCode?: number;
  environment?: string;
}

export async function getRuntimeLogs(
  baseUrl: string,
  headers: Record<string, string>,
  teamParams: string,
  projectId: string,
  deploymentId: string,
  options: GetRuntimeLogsOptions = {}
): Promise<RuntimeLogEntry[]> {
  const params = new URLSearchParams();

  if (options.since) params.set('since', options.since.toString());
  if (options.until) params.set('until', options.until.toString());
  if (options.limit) params.set('limit', options.limit.toString());
  if (options.direction) params.set('direction', options.direction);
  if (options.search) params.set('search', options.search);
  if (options.source) params.set('source', options.source);
  if (options.level) params.set('level', options.level);
  if (options.statusCode) params.set('statusCode', options.statusCode.toString());
  if (options.environment) params.set('environment', options.environment);

  if (teamParams) {
    const teamEntries = new URLSearchParams(teamParams);
    teamEntries.forEach((value, key) => params.set(key, value));
  }

  const queryString = params.toString();
  const url = `${baseUrl}/v1/projects/${encodeURIComponent(projectId)}/deployments/${encodeURIComponent(deploymentId)}/runtime-logs${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    headers: {
      ...headers,
      Accept: 'application/stream+json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Failed to get runtime logs: ${response.status} ${response.statusText} - ${body}`
    );
  }

  // Runtime logs endpoint returns newline-delimited JSON (application/stream+json)
  // We parse each line as a JSON object
  const text = await response.text();
  const lines = text.split('\n').filter((line) => line.trim());

  const entries: RuntimeLogEntry[] = [];
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as RuntimeLogEntry;
      entries.push(entry);
    } catch {
      logWarning(
        'getRuntimeLogs',
        `Skipping malformed runtime log line: ${line.substring(0, 100)}`
      );
    }
  }

  return entries;
}
