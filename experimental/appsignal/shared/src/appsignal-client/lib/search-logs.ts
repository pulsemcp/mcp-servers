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
    attributes?: Array<{
      key: string;
      value: string;
    }>;
  }>;
  // For LLM optimization, we can add a formatted summary
  formattedSummary?: string;
}

interface SearchLogsResponse {
  app: {
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
        attributes?: Array<{
          key: string;
          value: string;
        }>;
      }>;
    };
  };
}

export async function searchLogs(
  graphqlClient: GraphQLClient,
  appId: string,
  query: string,
  limit = 100,
  severities?: Array<'debug' | 'info' | 'warn' | 'error' | 'fatal'>
): Promise<LogSearchResult> {
  const gqlQuery = gql`
    query SearchLogs($appId: ID!, $query: String!, $limit: Int!, $severities: [SeverityEnum!]) {
      app(id: $appId) {
        id
        logs {
          queryWindow
          lines(query: $query, limit: $limit, order: DESC, severities: $severities) {
            id
            timestamp
            message
            severity
            hostname
            group
            attributes {
              key
              value
            }
          }
        }
      }
    }
  `;

  // Map our severity strings to GraphQL enum values
  const severityEnums = severities?.map((sev) => sev.toUpperCase());

  const data = await graphqlClient.request<SearchLogsResponse>(gqlQuery, {
    appId,
    query,
    limit,
    severities: severityEnums,
  });

  const lines = data.app.logs.lines || [];
  const queryWindow = data.app.logs.queryWindow;

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
      const attrs = line.attributes?.map((a) => `${a.key}=${a.value}`).join(', ');
      formattedSummary += `${i + 1}. [${line.timestamp}] ${line.severity} - ${line.message}`;
      if (line.hostname) formattedSummary += ` (host: ${line.hostname})`;
      if (line.group) formattedSummary += ` (group: ${line.group})`;
      if (attrs) formattedSummary += ` (${attrs})`;
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