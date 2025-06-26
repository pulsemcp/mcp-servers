import { describe, it, expect } from 'vitest';
import { GraphQLClient, gql } from 'graphql-request';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Manual tests for GraphQL query patterns.
 * These tests verify that our GraphQL queries follow AppSignal's API requirements.
 */
describe('AppSignal GraphQL Query Patterns - Manual Test', () => {
  let client: GraphQLClient;
  let testAppId: string;

  beforeAll(async () => {
    if (!process.env.APPSIGNAL_API_KEY) {
      throw new Error('Manual tests require APPSIGNAL_API_KEY environment variable');
    }

    client = new GraphQLClient(`https://appsignal.com/graphql?token=${process.env.APPSIGNAL_API_KEY}`);

    // Get a test app ID
    const appsQuery = gql`
      query GetApps {
        viewer {
          organizations {
            apps {
              id
              name
            }
          }
        }
      }
    `;

    const appsData = await client.request<any>(appsQuery);
    const apps = appsData.viewer.organizations.flatMap((org: any) => org.apps || []);
    
    if (apps.length === 0) {
      throw new Error('No apps found for testing');
    }
    
    testAppId = apps[0].id;
    console.log(`Using test app: ${apps[0].name} (${testAppId})`);
  });

  describe('Query Pattern Tests', () => {
    it('should reject direct app(id:) queries', async () => {
      const directAppQuery = gql`
        query DirectAppQuery($appId: ID!) {
          app(id: $appId) {
            id
            name
          }
        }
      `;

      await expect(
        client.request(directAppQuery, { appId: testAppId })
      ).rejects.toThrow();
    });

    it('should accept viewer.organizations.apps pattern', async () => {
      const correctQuery = gql`
        query CorrectPattern {
          viewer {
            organizations {
              apps {
                id
                name
              }
            }
          }
        }
      `;

      const result = await client.request<any>(correctQuery);
      expect(result.viewer.organizations).toBeDefined();
      expect(Array.isArray(result.viewer.organizations)).toBe(true);
    });
  });

  describe('Paginated Field Names', () => {
    it('should use "rows" not "incidents" for paginatedExceptionIncidents', async () => {
      const rowsQuery = gql`
        query TestRows {
          viewer {
            organizations {
              apps {
                id
                paginatedExceptionIncidents {
                  total
                  rows {
                    id
                  }
                }
              }
            }
          }
        }
      `;

      // This should work
      const result = await client.request<any>(rowsQuery);
      expect(result).toBeDefined();
    });

    it('should reject "incidents" field on paginatedExceptionIncidents', async () => {
      const incidentsQuery = gql`
        query TestIncidents {
          viewer {
            organizations {
              apps {
                id
                paginatedExceptionIncidents {
                  total
                  incidents {
                    id
                  }
                }
              }
            }
          }
        }
      `;

      // This should fail
      await expect(
        client.request(incidentsQuery)
      ).rejects.toThrow('Field \'incidents\' doesn\'t exist on type \'PaginatedExceptionIncidents\'');
    });
  });

  describe('Field Availability', () => {
    it('should reject "summary" field on anomaly incidents (causes 500 error)', async () => {
      const summaryQuery = gql`
        query TestSummaryField {
          viewer {
            organizations {
              apps {
                id
                paginatedAnomalyIncidents(limit: 1) {
                  total
                  rows {
                    summary
                  }
                }
              }
            }
          }
        }
      `;

      // This causes a 500 error
      await expect(async () => {
        await client.request(summaryQuery);
      }).rejects.toThrow();
    });

    it('should accept anomaly incidents without summary field', async () => {
      const noSummaryQuery = gql`
        query TestNoSummaryField {
          viewer {
            organizations {
              apps {
                id
                paginatedAnomalyIncidents(limit: 1) {
                  total
                  rows {
                    id
                    number
                    description
                  }
                }
              }
            }
          }
        }
      `;

      const result = await client.request<any>(noSummaryQuery);
      expect(result).toBeDefined();
    });
  });

  describe('Complete Query Pattern', () => {
    it('should successfully query exception incidents with correct pattern', async () => {
      const correctExceptionQuery = gql`
        query GetExceptionIncidents($state: IncidentStateEnum, $limit: Int!, $offset: Int!) {
          viewer {
            organizations {
              apps {
                id
                paginatedExceptionIncidents(state: $state, limit: $limit, offset: $offset) {
                  total
                  rows {
                    id
                    exceptionName
                    exceptionMessage
                    count
                    state
                  }
                }
              }
            }
          }
        }
      `;

      const result = await client.request<any>(correctExceptionQuery, {
        state: 'OPEN',
        limit: 5,
        offset: 0
      });

      expect(result.viewer.organizations).toBeDefined();
      
      // Find our test app
      let foundApp = false;
      for (const org of result.viewer.organizations) {
        const app = org.apps.find((a: any) => a.id === testAppId);
        if (app) {
          foundApp = true;
          expect(app.paginatedExceptionIncidents).toBeDefined();
          expect(typeof app.paginatedExceptionIncidents.total).toBe('number');
          expect(Array.isArray(app.paginatedExceptionIncidents.rows)).toBe(true);
          break;
        }
      }
      
      expect(foundApp).toBe(true);
    });
  });
});