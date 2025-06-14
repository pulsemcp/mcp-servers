import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { AnomalyIncident } from '../../types.js';

interface GetAnomalyIncidentResponse {
  app: {
    anomalyIncident: {
      id: string;
      number: number;
      summary?: string;
      description?: string;
      state?: string;
      count: number;
      createdAt?: string;
      lastOccurredAt?: string;
      updatedAt?: string;
      digests?: string[];
      alertState?: string;
      trigger?: {
        id: string;
        name: string;
        description?: string;
      };
      tags?: Array<{
        key: string;
        value: string;
      }>;
    };
  };
}

export async function getAnomalyIncident(
  graphqlClient: GraphQLClient,
  appId: string,
  incidentId: string
): Promise<AnomalyIncident> {
  const query = gql`
    query GetAnomalyIncident($appId: ID!, $incidentId: ID!) {
      app(id: $appId) {
        anomalyIncident(id: $incidentId) {
          id
          number
          summary
          description
          state
          count
          createdAt
          lastOccurredAt
          updatedAt
          digests
          alertState
          trigger {
            id
            name
            description
          }
          tags {
            key
            value
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetAnomalyIncidentResponse>(query, {
    appId,
    incidentId,
  });

  const incident = data.app.anomalyIncident;

  return {
    id: incident.id,
    number: incident.number,
    summary: incident.summary,
    description: incident.description,
    state: incident.state as 'open' | 'closed' | 'wip' | undefined,
    count: incident.count,
    createdAt: incident.createdAt,
    lastOccurredAt: incident.lastOccurredAt,
    updatedAt: incident.updatedAt,
    digests: incident.digests,
    alertState: incident.alertState,
    trigger: incident.trigger,
    tags: incident.tags,
  };
}