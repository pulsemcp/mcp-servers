import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';

export interface LogIncident {
  id: string;
  number: number;
  summary?: string;
  description?: string;
  severity?: string;
  state?: string;
  count: number;
  createdAt?: string;
  lastOccurredAt?: string;
  updatedAt?: string;
  digests?: string[];
  trigger: {
    id: string;
    name: string;
    description?: string;
    query?: string;
    severities: string[];
    sourceIds: string[];
  };
  logLine?: {
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
  };
}

interface GetLogIncidentResponse {
  app: {
    id: string;
    logIncident: {
      id: string;
      number: number;
      summary?: string;
      description?: string;
      severity?: 'critical' | 'high' | 'medium' | 'low' | 'debug';
      state?: 'open' | 'closed';
      count: number;
      createdAt?: string;
      lastOccurredAt?: string;
      updatedAt?: string;
      digests?: string[];
      trigger: {
        id: string;
        name: string;
        description?: string;
        query?: string;
        severities: string[];
        sourceIds: string[];
      };
      logLine?: {
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
      };
    };
  };
}

export async function getLogIncident(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string
): Promise<LogIncident> {
  const query = gql`
    query GetLogIncident($appId: ID!, $incidentId: ID!) {
      app(id: $appId) {
        id
        logIncident(id: $incidentId) {
          id
          number
          summary
          description
          severity
          state
          count
          createdAt
          lastOccurredAt
          updatedAt
          digests
          trigger {
            id
            name
            description
            query
            severities
            sourceIds
          }
          logLine {
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

  const data = await graphqlClient.request<GetLogIncidentResponse>(query, {
    appId,
    incidentId,
  });

  const incident = data.app.logIncident;

  // Return the full incident data
  return {
    id: incident.id,
    number: incident.number,
    summary: incident.summary,
    description: incident.description,
    severity: incident.severity,
    state: incident.state,
    count: incident.count,
    createdAt: incident.createdAt,
    lastOccurredAt: incident.lastOccurredAt,
    updatedAt: incident.updatedAt,
    digests: incident.digests,
    trigger: incident.trigger,
    logLine: incident.logLine,
  };
}
