import { gql } from 'graphql-request';
import type { GraphQLClient } from 'graphql-request';
import type { App } from '../../graphql/types.js';

interface GetAppsResponse {
  viewer: {
    organizations: Array<{
      apps: Array<Pick<App, 'id' | 'name' | 'environment'>>;
    }>;
  };
}

export async function getApps(
  graphqlClient: GraphQLClient
): Promise<Array<{ id: string; name: string; environment: string }>> {
  const query = gql`
    query GetApps {
      viewer {
        organizations {
          apps {
            id
            name
            environment
          }
        }
      }
    }
  `;

  const data = await graphqlClient.request<GetAppsResponse>(query);

  // Flatten all apps from all organizations
  const allApps = data.viewer.organizations.flatMap((org) => org.apps || []);

  return allApps.map((app) => ({
    id: app.id,
    name: app.name,
    environment: app.environment,
  }));
}
