import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface LogSearchResult {
  queryWindow: number;
  lines: Array<{
    id: string;
    timestamp: string;
    message: string;
    severity: string;
    hostname: string;
    group?: string;
  }>;
  // For LLM optimization, we can add a formatted summary
  formattedSummary?: string;
}

interface SearchLogsResponse {
  viewer: {
    organizations: Array<{
      apps: Array<{
        id: string;
        logs: {
          queryWindow: number;
          lines?: Array<{
            id: string;
            timestamp: string;
            message: string;
            severity: string;
            hostname: string;
            group?: string;
            // attributes removed from query due to API issues
          }>;
        };
      }>;
    }>;
  };
}

export async function searchLogs(
  graphqlClient: GraphQLClient,
  appId: string,
  query: string,
  limit = 100,
  severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>,
  start?: string,
  end?: string
): Promise<LogSearchResult> {
  // NOTE: AppSignal GraphQL API limitation - we have to query all apps and filter
  // This can cause 500 errors with large datasets. Future improvement would be
  // to find a more targeted query approach if AppSignal adds support for it.

  // NOTE: AppSignal API has a bug where start/end parameters cause 400 errors when
  // passed as GraphQL variables, but work fine when hardcoded in the query string.
  // As a workaround, we build the query string dynamically with these values.
  const startParam = start ? `, start: "${start}"` : '';
  const endParam = end ? `, end: "${end}"` : '';

  const gqlQuery = gql`
    query SearchLogs($query: String!, $limit: Int!, $severities: [SeverityEnum!]) {
      viewer {
        organizations {
          apps {
            id
            logs {
              queryWindow
              lines(query: $query, limit: $limit, severities: $severities${startParam}${endParam}) {
                id
                timestamp
                message
                severity
                hostname
                group
              }
            }
          }
        }
      }
    }
  `;

  // Map our severity strings to GraphQL enum values
  // Note: If severities is an empty array, we should pass undefined to avoid 400 errors
  const severityEnums =
    severities && severities.length > 0 ? severities.map((sev) => sev.toUpperCase()) : undefined;

  const data = await graphqlClient.request<SearchLogsResponse>(gqlQuery, {
    query,
    limit,
    severities: severityEnums,
  });

  // Find the app with the matching ID
  let targetApp: (typeof data.viewer.organizations)[0]['apps'][0] | null = null;
  for (const org of data.viewer.organizations) {
    targetApp = org.apps.find((app) => app.id === appId) || null;
    if (targetApp) break;
  }

  if (!targetApp) {
    throw new Error(`App with ID ${appId} not found`);
  }

  const lines = targetApp.logs.lines || [];
  const queryWindow = targetApp.logs.queryWindow;

  // Create a formatted summary for LLM optimization
  let formattedSummary = `Found ${lines.length} log entries within ${queryWindow}s window.\n\n`;

  if (lines.length > 0) {
    // Group logs by severity for a concise overview
    const bySeverity = lines.reduce(
      (acc, line) => {
        if (!acc[line.severity]) acc[line.severity] = [];
        acc[line.severity].push(line);
        return acc;
      },
      {} as Record<string, typeof lines>
    );

    formattedSummary += 'Summary by severity:\n';
    for (const [severity, logs] of Object.entries(bySeverity)) {
      formattedSummary += `- ${severity}: ${logs.length} entries\n`;
    }

    formattedSummary += '\nRecent log samples:\n';
    // Include first 5 logs as samples
    lines.slice(0, 5).forEach((line, i) => {
      // Note: attributes removed from query due to API 500 error
      formattedSummary += `${i + 1}. [${line.timestamp}] ${line.severity} - ${line.message}`;
      if (line.hostname) formattedSummary += ` (host: ${line.hostname})`;
      if (line.group) formattedSummary += ` (group: ${line.group})`;
      formattedSummary += '\n';
    });

    if (lines.length > 5) {
      formattedSummary += `... and ${lines.length - 5} more entries\n`;
    }
  }

  // Return full data with formatted summary
  return {
    queryWindow,
    lines,
    formattedSummary,
  };
}
