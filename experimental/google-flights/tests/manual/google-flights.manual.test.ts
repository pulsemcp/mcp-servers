import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type TestOutcome = 'SUCCESS' | 'WARNING' | 'FAILURE';

function reportOutcome(testName: string, outcome: TestOutcome, details?: string) {
  const emoji = outcome === 'SUCCESS' ? '✅' : outcome === 'WARNING' ? '⚠️' : '❌';
  console.log(`\n${emoji} ${testName}: ${outcome}`);
  if (details) {
    console.log(`   Details: ${details}`);
  }
}

describe('Google Flights Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.js');

    client = new TestMCPClient({
      serverPath,
      env: {},
      debug: false,
    });

    await client.connect();
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  // =========================================================================
  // search_flights
  // =========================================================================
  describe('search_flights', () => {
    it('should search domestic one-way flights (SFO -> LAX)', async () => {
      const testName = 'search_flights - domestic one-way';

      const result = await client.callTool('search_flights', {
        origin: 'SFO',
        destination: 'LAX',
        departure_date: '2026-04-15',
        trip_type: 'one_way',
        seat_class: 'economy',
        max_results: 10,
      });

      expect(result).toHaveProperty('content');
      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);

      expect(data.query.origin).toBe('SFO');
      expect(data.query.destination).toBe('LAX');
      expect(data.total_results).toBeGreaterThan(0);
      expect(data.flights.length).toBeGreaterThan(0);
      expect(data.flights.length).toBeLessThanOrEqual(10);

      // Validate flight structure
      const flight = data.flights[0];
      expect(flight).toHaveProperty('price');
      expect(flight).toHaveProperty('airline');
      expect(flight).toHaveProperty('airline_code');
      expect(flight).toHaveProperty('departure');
      expect(flight).toHaveProperty('arrival');
      expect(flight).toHaveProperty('duration_minutes');
      expect(flight).toHaveProperty('stops');
      expect(flight).toHaveProperty('segments');
      expect(flight).toHaveProperty('fare_brand');
      expect(flight).toHaveProperty('extensions');
      expect(flight.price).toBeGreaterThan(0);
      expect(flight.segments.length).toBeGreaterThan(0);

      // Validate fare_brand is a string or null
      if (flight.fare_brand !== null) {
        expect(typeof flight.fare_brand).toBe('string');
        expect(['Economy', 'Economy+', 'Economy Flex']).toContain(flight.fare_brand);
      }

      // Validate extensions structure
      expect(flight.extensions).toHaveProperty('carry_on_included');
      expect(flight.extensions).toHaveProperty('checked_bags_included');
      expect(typeof flight.extensions.carry_on_included).toBe('boolean');
      expect(typeof flight.extensions.checked_bags_included).toBe('number');

      // Validate segment structure
      const segment = flight.segments[0];
      expect(segment).toHaveProperty('flight_number');
      expect(segment).toHaveProperty('airline');
      expect(segment).toHaveProperty('origin');
      expect(segment).toHaveProperty('destination');
      expect(segment).toHaveProperty('aircraft');
      expect(segment.origin).toBe('SFO');

      // Log fare brand distribution
      const fareBrands = data.flights.map((f: { fare_brand: string | null }) => f.fare_brand);
      const brandCounts: Record<string, number> = {};
      for (const brand of fareBrands) {
        const key = brand || 'null';
        brandCounts[key] = (brandCounts[key] || 0) + 1;
      }

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.total_results} flights, cheapest: $${data.flights[0].price} on ${data.flights[0].airline}`
      );
      console.log(
        '   Sample flights:',
        data.flights
          .slice(0, 5)
          .map(
            (f: {
              airline: string;
              price: number;
              departure: string;
              stops: number;
              fare_brand: string | null;
            }) =>
              `${f.airline} $${f.price} dep:${f.departure} stops:${f.stops} fare:${f.fare_brand || 'N/A'}`
          )
          .join(' | ')
      );
      console.log('   Fare brand distribution:', JSON.stringify(brandCounts));
    }, 60000);

    it('should search international round-trip flights (JFK -> LHR)', async () => {
      const testName = 'search_flights - international round-trip';

      const result = await client.callTool('search_flights', {
        origin: 'JFK',
        destination: 'LHR',
        departure_date: '2026-05-01',
        return_date: '2026-05-15',
        trip_type: 'round_trip',
        seat_class: 'economy',
        max_results: 10,
      });

      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);

      expect(data.query.trip_type).toBe('round_trip');
      expect(data.total_results).toBeGreaterThan(0);
      expect(data.flights.length).toBeGreaterThan(0);

      const airlines = [...new Set(data.flights.map((f: { airline: string }) => f.airline))];

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.total_results} flights across ${airlines.length} airlines: ${airlines.slice(0, 5).join(', ')}`
      );
    }, 60000);

    it('should search business class flights (LAX -> JFK)', async () => {
      const testName = 'search_flights - business class';

      const result = await client.callTool('search_flights', {
        origin: 'LAX',
        destination: 'JFK',
        departure_date: '2026-04-20',
        trip_type: 'one_way',
        seat_class: 'business',
        max_results: 5,
      });

      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);

      expect(data.query.seat_class).toBe('business');
      expect(data.total_results).toBeGreaterThan(0);

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.total_results} business class flights, prices from $${Math.min(...data.flights.map((f: { price: number }) => f.price))}`
      );
    }, 60000);

    it('should filter nonstop flights only', async () => {
      const testName = 'search_flights - nonstop filter';

      const result = await client.callTool('search_flights', {
        origin: 'SFO',
        destination: 'LAX',
        departure_date: '2026-04-15',
        trip_type: 'one_way',
        max_stops: 'nonstop',
        max_results: 10,
      });

      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);

      // All returned flights should be nonstop
      for (const flight of data.flights) {
        expect(flight.stops).toBe(0);
      }

      reportOutcome(testName, 'SUCCESS', `All ${data.flights.length} flights are nonstop`);
    }, 60000);

    it('should support pagination', async () => {
      const testName = 'search_flights - pagination';

      // First page
      const page1Result = await client.callTool('search_flights', {
        origin: 'SFO',
        destination: 'LAX',
        departure_date: '2026-04-15',
        trip_type: 'one_way',
        max_results: 5,
        offset: 0,
        sort_by: 'price',
      });

      expect(page1Result.isError).toBeFalsy();
      const page1 = JSON.parse((page1Result.content[0] as { text: string }).text);

      // Second page
      const page2Result = await client.callTool('search_flights', {
        origin: 'SFO',
        destination: 'LAX',
        departure_date: '2026-04-15',
        trip_type: 'one_way',
        max_results: 5,
        offset: 5,
        sort_by: 'price',
      });

      expect(page2Result.isError).toBeFalsy();
      const page2 = JSON.parse((page2Result.content[0] as { text: string }).text);

      expect(page1.showing.offset).toBe(0);
      expect(page2.showing.offset).toBe(5);

      // Pages should have different flights (since sorted by price, page2 should be same or higher)
      if (page1.flights.length > 0 && page2.flights.length > 0) {
        const lastPage1Price = page1.flights[page1.flights.length - 1].price;
        const firstPage2Price = page2.flights[0].price;
        expect(firstPage2Price).toBeGreaterThanOrEqual(lastPage1Price);
      }

      reportOutcome(
        testName,
        'SUCCESS',
        `Page 1: ${page1.flights.length} flights (offset ${page1.showing.offset}), Page 2: ${page2.flights.length} flights (offset ${page2.showing.offset}), Total: ${page1.total_results}`
      );
    }, 120000);

    it('should sort by price', async () => {
      const testName = 'search_flights - sort by price';

      const result = await client.callTool('search_flights', {
        origin: 'BOS',
        destination: 'DCA',
        departure_date: '2026-04-10',
        trip_type: 'one_way',
        sort_by: 'price',
        max_results: 15,
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse((result.content[0] as { text: string }).text);

      // Verify price ascending order
      for (let i = 1; i < data.flights.length; i++) {
        expect(data.flights[i].price).toBeGreaterThanOrEqual(data.flights[i - 1].price);
      }

      reportOutcome(
        testName,
        'SUCCESS',
        `${data.flights.length} flights sorted by price: $${data.flights[0]?.price} to $${data.flights[data.flights.length - 1]?.price}`
      );
    }, 60000);

    it('should return error for round_trip without return_date', async () => {
      const testName = 'search_flights - validation error';

      const result = await client.callTool('search_flights', {
        origin: 'SFO',
        destination: 'LAX',
        departure_date: '2026-04-15',
        trip_type: 'round_trip',
        // Missing return_date
      });

      expect(result.isError).toBeTruthy();
      const text = (result.content[0] as { text: string }).text;
      expect(text).toContain('return_date');

      reportOutcome(testName, 'SUCCESS', 'Correctly returned validation error');
    }, 30000);

    it('should search transpacific flights (SFO -> NRT)', async () => {
      const testName = 'search_flights - transpacific';

      const result = await client.callTool('search_flights', {
        origin: 'SFO',
        destination: 'NRT',
        departure_date: '2026-06-01',
        trip_type: 'one_way',
        max_results: 10,
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse((result.content[0] as { text: string }).text);
      expect(data.total_results).toBeGreaterThan(0);

      // Some flights should have connections (stops > 0)
      const hasConnecting = data.flights.some((f: { stops: number }) => f.stops > 0);

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.total_results} flights, connecting flights present: ${hasConnecting}`
      );
    }, 60000);
  });

  // =========================================================================
  // get_date_grid
  // =========================================================================
  describe('get_date_grid', () => {
    it('should get date grid for domestic route', async () => {
      const testName = 'get_date_grid - domestic route';

      const result = await client.callTool('get_date_grid', {
        origin: 'SFO',
        destination: 'LAX',
        departure_date: '2026-04-15',
      });

      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);

      expect(data.query.origin).toBe('SFO');
      expect(data.query.destination).toBe('LAX');
      expect(data.date_grid.length).toBeGreaterThan(0);
      expect(data.cheapest).not.toBeNull();
      expect(data.cheapest.price).toBeGreaterThan(0);
      expect(data.cheapest.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Validate entries have proper structure
      for (const entry of data.date_grid) {
        expect(entry).toHaveProperty('date');
        expect(entry).toHaveProperty('price');
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.price).toBeGreaterThan(0);
      }

      reportOutcome(
        testName,
        'SUCCESS',
        `${data.date_grid.length} dates, cheapest: $${data.cheapest.price} on ${data.cheapest.date}`
      );
    }, 60000);

    it('should get date grid for international route', async () => {
      const testName = 'get_date_grid - international route';

      const result = await client.callTool('get_date_grid', {
        origin: 'JFK',
        destination: 'LHR',
        departure_date: '2026-05-01',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse((result.content[0] as { text: string }).text);

      // International routes should also have a date grid
      if (data.date_grid.length > 0) {
        expect(data.cheapest).not.toBeNull();
        reportOutcome(
          testName,
          'SUCCESS',
          `${data.date_grid.length} dates, cheapest: $${data.cheapest.price} on ${data.cheapest.date}`
        );
      } else {
        reportOutcome(
          testName,
          'WARNING',
          'No date grid data returned (may not be available for this route)'
        );
      }
    }, 60000);
  });

  // =========================================================================
  // find_airport_code
  // =========================================================================
  describe('find_airport_code', () => {
    it('should find airports by city name', async () => {
      const testName = 'find_airport_code - by city';

      const result = await client.callTool('find_airport_code', {
        query: 'San Francisco',
      });

      expect(result.isError).toBeFalsy();

      const text = (result.content[0] as { text: string }).text;
      const data = JSON.parse(text);

      expect(data.results.length).toBeGreaterThan(0);

      // SFO should be in the results
      const sfo = data.results.find((r: { code: string }) => r.code === 'SFO');
      expect(sfo).toBeDefined();
      expect(sfo.name).toContain('San Francisco');

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.results.length} airports: ${data.results.map((r: { code: string }) => r.code).join(', ')}`
      );
    }, 60000);

    it('should find airports by airport name', async () => {
      const testName = 'find_airport_code - by airport name';

      const result = await client.callTool('find_airport_code', {
        query: 'Heathrow',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse((result.content[0] as { text: string }).text);

      expect(data.results.length).toBeGreaterThan(0);

      // LHR should be in results
      const lhr = data.results.find((r: { code: string }) => r.code === 'LHR');
      expect(lhr).toBeDefined();

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.results.length} airports: ${data.results.map((r: { code: string }) => r.code).join(', ')}`
      );
    }, 60000);

    it('should find airports by IATA code', async () => {
      const testName = 'find_airport_code - by code';

      const result = await client.callTool('find_airport_code', {
        query: 'LAX',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse((result.content[0] as { text: string }).text);

      expect(data.results.length).toBeGreaterThan(0);

      const lax = data.results.find((r: { code: string }) => r.code === 'LAX');
      expect(lax).toBeDefined();

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.results.length} airports, LAX: ${lax?.name}`
      );
    }, 60000);

    it('should find airports for Tokyo', async () => {
      const testName = 'find_airport_code - Tokyo (multiple airports)';

      const result = await client.callTool('find_airport_code', {
        query: 'Tokyo',
      });

      expect(result.isError).toBeFalsy();

      const data = JSON.parse((result.content[0] as { text: string }).text);

      expect(data.results.length).toBeGreaterThan(0);

      const codes = data.results.map((r: { code: string }) => r.code);

      reportOutcome(
        testName,
        'SUCCESS',
        `Found ${data.results.length} airports: ${codes.join(', ')}`
      );
    }, 60000);
  });

  // =========================================================================
  // Tool listing
  // =========================================================================
  describe('tool listing', () => {
    it('should list all 3 tools', async () => {
      const testName = 'listTools';

      const result = await client.listTools();

      expect(result.tools.length).toBe(3);

      const toolNames = result.tools.map((t: { name: string }) => t.name);
      expect(toolNames).toContain('search_flights');
      expect(toolNames).toContain('get_date_grid');
      expect(toolNames).toContain('find_airport_code');

      reportOutcome(testName, 'SUCCESS', `Tools: ${toolNames.join(', ')}`);
    }, 30000);
  });
});
