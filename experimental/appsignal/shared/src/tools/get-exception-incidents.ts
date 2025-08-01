import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  states:
    'Filter incidents by state(s). OPEN = active errors, WIP = being investigated, CLOSED = resolved. Defaults to ["OPEN"] if not provided',
  limit: 'Maximum number of incidents to return for pagination. Defaults to 50',
  offset: 'Number of incidents to skip for pagination. Defaults to 0',
} as const;

export function getExceptionIncidentsTool(
  _server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  const GetExceptionIncidentsShape = {
    states: z
      .array(z.enum(['OPEN', 'CLOSED', 'WIP']))
      .optional()
      .describe(PARAM_DESCRIPTIONS.states),
    limit: z.number().optional().describe(PARAM_DESCRIPTIONS.limit),
    offset: z.number().optional().describe(PARAM_DESCRIPTIONS.offset),
  };

  const GetExceptionIncidentsSchema = z.object(GetExceptionIncidentsShape);

  return {
    name: 'get_exception_incidents',
    description: `Retrieve a list of exception incidents from your AppSignal application. Exception incidents group similar errors together, showing patterns of application crashes, errors, and unhandled exceptions. This tool provides an overview of all exception types affecting your application, with filtering and pagination capabilities.

Example response:
{
  "incidents": [
    {
      "id": "exc-789",
      "error": "ActiveRecord::RecordNotFound",
      "message": "Couldn't find User with 'id'=999",
      "status": "OPEN",
      "firstOccurredAt": "2024-01-10T10:00:00Z",
      "lastOccurredAt": "2024-01-15T14:30:00Z",
      "occurrenceCount": 523,
      "affectedUsers": 312,
      "environment": "production"
    },
    {
      "id": "exc-456",
      "error": "Net::ReadTimeout",
      "message": "Net::ReadTimeout with #<TCPSocket:(closed)>",
      "status": "WIP",
      "firstOccurredAt": "2024-01-14T09:00:00Z",
      "lastOccurredAt": "2024-01-15T15:00:00Z",
      "occurrenceCount": 89,
      "affectedUsers": 45,
      "environment": "production"
    }
  ],
  "totalCount": 47,
  "hasMore": true
}

State meanings:
- OPEN: Active errors requiring attention
- WIP: Errors being investigated or fixed
- CLOSED: Resolved errors or exceptions marked as handled

Use cases:
- Getting an overview of all application errors
- Prioritizing which exceptions to fix based on user impact
- Monitoring error trends and patterns
- Tracking the status of error resolution efforts
- Identifying the most frequent or critical exceptions`,
    inputSchema: GetExceptionIncidentsShape,
    handler: async (args: unknown) => {
      // Handle all parameter scenarios: {}, undefined, or missing entirely
      const { states, limit, offset } = GetExceptionIncidentsSchema.parse(args || {});
      const appId = getEffectiveAppId();
      if (!appId) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Error: No app ID configured. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.',
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        // Handle undefined parameters properly to trigger default values
        const actualStates = states ?? ['OPEN'];
        const actualLimit = limit ?? 50;
        const actualOffset = offset ?? 0;

        const result = await client.getExceptionIncidents(actualStates, actualLimit, actualOffset);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching exception incidents: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
