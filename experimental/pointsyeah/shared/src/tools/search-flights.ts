import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { IPointsYeahClient } from '../server.js';
import { FlightSearchParamsSchema } from '../types.js';
import type { FlightResult, FlightRoute } from '../types.js';

const PARAM_DESCRIPTIONS = {
  departure:
    'Origin airport or city code. Examples: "SFO", "NYC", "LAX", "ORD". ' +
    'Use standard IATA airport codes or city codes.',
  arrival:
    'Destination airport or city code. Examples: "NYC", "LHR", "NRT". ' +
    'Use standard IATA airport codes or city codes.',
  departDate:
    'Outbound departure date in YYYY-MM-DD format. ' +
    'Example: "2026-04-01". Must be a future date.',
  returnDate:
    'Return date in YYYY-MM-DD format. Required for round-trip searches. ' +
    'Example: "2026-04-08". Must be after departDate.',
  tripType:
    'Trip type: "1" for one-way, "2" for round-trip. Default: "2". ' +
    'Set to "1" if you only need outbound flights.',
  adults: 'Number of adult passengers (1-9). Default: 1.',
  children: 'Number of child passengers (0-9). Default: 0.',
  cabins:
    'Cabin classes to search. Options: "Economy", "Premium Economy", "Business", "First". ' +
    'Default: ["Economy", "Business"]. Multiple cabins can be specified.',
} as const;

const TOOL_DESCRIPTION = `Search for award flights using points/miles across multiple airline loyalty programs.

This tool searches PointsYeah for live flight availability using points and miles. It checks availability across 20+ airline programs and shows transfer options from major bank programs (Chase, Amex, Citi, etc.).

**Returns:** A formatted list of flight options showing:
- Airline program and points required
- Flight segments with times and cabin class
- Available bank transfer options and point costs
- Number of available seats

**Use cases:**
- Find the cheapest award flight between two cities
- Compare points costs across different loyalty programs
- Discover transfer partner options from bank reward programs
- Search for premium cabin availability (Business, First)

**Note:** This performs a live search that may take 30-90 seconds to complete as it queries multiple airline programs in real time. Requires Playwright to be installed.`;

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatRoute(route: FlightRoute): string {
  if (!route) return '  (no route data)';

  const lines: string[] = [];
  const { payment, segments, transfer } = route;

  if (payment) {
    lines.push(
      `  ${payment.miles.toLocaleString()} ${payment.unit} + $${payment.tax.toFixed(2)} tax | ${payment.cabin} | ${payment.seats} seat(s)`
    );
  }

  for (const seg of segments ?? []) {
    lines.push(
      `    ${seg.flight_number}: ${seg.da} ${seg.dt.split('T')[1]?.substring(0, 5) || ''} -> ${seg.aa} ${seg.at.split('T')[1]?.substring(0, 5) || ''} (${formatDuration(seg.duration)}) [${seg.cabin}]`
    );
  }

  if (transfer && transfer.length > 0) {
    const transferStrs = transfer.map((t) => `${t.bank}: ${t.points.toLocaleString()} pts`);
    lines.push(`    Transfer: ${transferStrs.join(' | ')}`);
  }

  return lines.join('\n');
}

function formatResult(result: FlightResult): string {
  const lines: string[] = [];
  lines.push(`### ${result.program} (${result.code}) - ${result.date}`);
  lines.push(`${result.departure} -> ${result.arrival}`);

  for (const route of result.routes ?? []) {
    lines.push(formatRoute(route));
  }

  return lines.join('\n');
}

export function searchFlightsTool(_server: Server, clientFactory: () => IPointsYeahClient) {
  return {
    name: 'search_flights',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        departure: { type: 'string', description: PARAM_DESCRIPTIONS.departure },
        arrival: { type: 'string', description: PARAM_DESCRIPTIONS.arrival },
        departDate: { type: 'string', description: PARAM_DESCRIPTIONS.departDate },
        returnDate: { type: 'string', description: PARAM_DESCRIPTIONS.returnDate },
        tripType: {
          type: 'string',
          enum: ['1', '2'],
          default: '2',
          description: PARAM_DESCRIPTIONS.tripType,
        },
        adults: {
          type: 'number',
          minimum: 1,
          maximum: 9,
          default: 1,
          description: PARAM_DESCRIPTIONS.adults,
        },
        children: {
          type: 'number',
          minimum: 0,
          maximum: 9,
          default: 0,
          description: PARAM_DESCRIPTIONS.children,
        },
        cabins: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['Economy', 'Premium Economy', 'Business', 'First'],
          },
          default: ['Economy', 'Business'],
          description: PARAM_DESCRIPTIONS.cabins,
        },
      },
      required: ['departure', 'arrival', 'departDate'],
    },
    handler: async (args: unknown) => {
      try {
        const params = FlightSearchParamsSchema.parse(args);

        if (params.tripType === '2' && !params.returnDate) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: returnDate is required for round-trip searches. Either provide a returnDate or set tripType to "1" for one-way.',
              },
            ],
            isError: true,
          };
        }

        const client = clientFactory();
        const searchResults = await client.searchFlights(params);

        if (!searchResults.results || searchResults.results.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No award flights found for ${params.departure} -> ${params.arrival} on ${params.departDate}.`,
              },
            ],
          };
        }

        const header = [
          `## Award Flight Search Results`,
          '',
          `**Route:** ${params.departure} -> ${params.arrival}`,
          `**Date:** ${params.departDate}${params.returnDate ? ` - ${params.returnDate}` : ''}`,
          `**Passengers:** ${params.adults} adult(s)${params.children ? `, ${params.children} child(ren)` : ''}`,
          `**Cabins:** ${params.cabins.join(', ')}`,
          `**Results found:** ${searchResults.total} flight option(s)`,
          '',
        ];

        const formattedResults = searchResults.results.map(formatResult);

        return {
          content: [
            {
              type: 'text',
              text: [...header, ...formattedResults].join('\n'),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : undefined;
        return {
          content: [
            {
              type: 'text',
              text: stack
                ? `Error searching flights:\n\n${stack}`
                : `Error searching flights: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
