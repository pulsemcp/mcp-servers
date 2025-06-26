import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getExceptionIncidentTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'get_exception_incident',
    `Retrieve detailed information about a specific exception incident in your AppSignal application. Exception incidents represent errors, crashes, or unhandled exceptions that occurred in your application. This tool provides comprehensive details about a single exception, including the error message, stack trace, occurrence count, affected users, and environment context.

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
    {
      incidentId: z
        .string()
        .describe('The unique identifier of the exception incident to retrieve'),
    },
    async ({ incidentId }) => {
      const appId = getEffectiveAppId();
      if (!appId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No app ID configured. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.',
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        const incident = await client.getExceptionIncident(incidentId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(incident, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching exception incident details: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
