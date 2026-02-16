import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { createIntegrationMockPointsYeahClient } from '../../shared/src/pointsyeah-client/pointsyeah-client.integration-mock.js';
import type { IPointsYeahClient } from '../../shared/src/server.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('PointsYeah MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Tools', () => {
    it('should list all available tools', async () => {
      const mockClient = createIntegrationMockPointsYeahClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.listTools();
      const tools = result.tools;
      expect(tools.length).toBe(7);

      const toolNames = tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('search_flights');
      expect(toolNames).toContain('get_search_history');
      expect(toolNames).toContain('get_user_membership');
      expect(toolNames).toContain('get_user_preferences');
      expect(toolNames).toContain('get_flight_recommendations');
      expect(toolNames).toContain('get_hotel_recommendations');
      expect(toolNames).toContain('get_explorer_count');
    });

    it('should execute search_flights with mock data', async () => {
      const mockClient = createIntegrationMockPointsYeahClient({
        searchResults: [
          {
            program: 'JetBlue TrueBlue',
            code: 'B6',
            date: '2026-04-06',
            departure: 'JFK',
            arrival: 'SFO',
            routes: [
              {
                payment: {
                  currency: 'USD',
                  tax: 5.6,
                  miles: 23300,
                  cabin: 'Economy',
                  unit: 'points',
                  seats: 5,
                  cash_price: 0,
                },
                segments: [
                  {
                    duration: 380,
                    flight_number: 'B615',
                    dt: '2026-04-06T06:30:00',
                    da: 'JFK',
                    at: '2026-04-06T09:50:00',
                    aa: 'SFO',
                    cabin: 'Blue',
                  },
                ],
                transfer: [{ bank: 'Chase Ultimate Rewards', actual_points: 23300, points: 23500 }],
              },
            ],
          },
        ],
      });
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('search_flights', {
        departure: 'JFK',
        arrival: 'SFO',
        departDate: '2026-04-06',
        tripType: '1',
      });

      expect(result.content[0].text).toContain('JetBlue TrueBlue');
      expect(result.content[0].text).toContain('23,300');
      expect(result.content[0].text).toContain('B615');
    });

    it('should execute get_user_membership', async () => {
      const mockClient = createIntegrationMockPointsYeahClient({
        membership: { plan: 'premium', status: 'active', expiresAt: '2027-01-01' },
      });
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('get_user_membership', {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.plan).toBe('premium');
    });

    it('should execute get_explorer_count', async () => {
      const mockClient = createIntegrationMockPointsYeahClient({
        explorerCount: { count: 99 },
      });
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.callTool('get_explorer_count', {});
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.count).toBe(99);
    });
  });

  describe('Resources', () => {
    it('should list available resources', async () => {
      const mockClient = createIntegrationMockPointsYeahClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.listResources();
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].uri).toBe('pointsyeah://config');
    });

    it('should read config resource', async () => {
      const mockClient = createIntegrationMockPointsYeahClient({});
      client = await createTestMCPClientWithMock(mockClient);

      const result = await client.readResource('pointsyeah://config');
      expect(result.contents[0]).toMatchObject({
        uri: 'pointsyeah://config',
        mimeType: 'application/json',
      });

      const config = JSON.parse(result.contents[0].text as string);
      expect(config.server.name).toBe('pointsyeah-mcp-server');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked external client.
 */
async function createTestMCPClientWithMock(
  mockClient: IPointsYeahClient & { mockData?: unknown }
): Promise<TestMCPClient> {
  const mockData = mockClient.mockData || {};

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      POINTSYEAH_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
