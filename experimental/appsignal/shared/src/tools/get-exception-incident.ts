import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  incidentNumber: 'The unique number of the exception incident to retrieve',
} as const;

export function getExceptionIncidentTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  const GetExceptionIncidentSchema = z.object({
    incidentNumber: z.string().describe(PARAM_DESCRIPTIONS.incidentNumber),
  });

  return server.registerTool(
    'get_exception_incident',
    {
      title: 'Get Exception Incident',
      description: `Retrieve detailed information about a specific exception incident in your AppSignal application. Exception incidents represent errors, crashes, or unhandled exceptions that occurred in your application. This tool provides comprehensive details about a single exception, including the error message, stack trace, occurrence count, affected users, and environment context.

Example response:
{
  "id": "exc-12345",
  "error": "NoMethodError",
  "message": "undefined method 'name' for nil:NilClass",
  "status": "OPEN",
  "firstOccurredAt": "2024-01-15T08:00:00Z",
  "lastOccurredAt": "2024-01-15T16:45:00Z",
  "occurrenceCount": 142,
  "affectedUsers": 89,
  "environment": "production",
  "backtrace": [
    {
      "file": "app/models/user.rb",
      "line": 45,
      "method": "full_name"
    }
  ],
  "tags": {
    "controller": "UsersController",
    "action": "show",
    "hostname": "web-01"
  }
}

Use cases:
- Investigating specific application errors and crashes
- Understanding the frequency and impact of exceptions
- Analyzing stack traces to identify root causes
- Tracking which users are affected by specific errors
- Monitoring the resolution status of known issues`,
      inputSchema: {
        type: 'object',
        properties: {
          incidentNumber: {
            type: 'string',
            description: PARAM_DESCRIPTIONS.incidentNumber,
          },
        },
        required: ['incidentNumber'],
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    async (args: unknown) => {
      const { incidentNumber } = GetExceptionIncidentSchema.parse(args);
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
        const incident = await client.getExceptionIncident(incidentNumber);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(incident, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error fetching exception incident details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
