import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getExceptionIncidentSampleTool(
  server: McpServer,
  clientFactory: () => IAppsignalClient
) {
  return server.tool(
    'get_exception_incident_sample',
    `Retrieve detailed sample data for a specific occurrence of an exception incident. While exception incidents group similar errors together, this tool provides the full context of a single occurrence, including complete stack traces, request parameters, session data, and environment details. This is essential for debugging specific error instances.

Example response:
{
  "id": "sample-98765",
  "incidentId": "exc-12345",
  "occurredAt": "2024-01-15T14:32:15Z",
  "error": "NoMethodError",
  "message": "undefined method 'name' for nil:NilClass",
  "backtrace": [
    {
      "file": "/app/models/user.rb",
      "line": 45,
      "method": "full_name",
      "context": [
        "43:   def full_name",
        "44:     return 'Anonymous' if first_name.blank?",
        "45:     '#{first_name} #{last_name.name}' # Error here",
        "46:   end"
      ]
    }
  ],
  "params": {
    "controller": "users",
    "action": "show",
    "id": "123"
  },
  "session": {
    "user_id": 456,
    "created_at": "2024-01-15T08:00:00Z"
  },
  "metadata": {
    "hostname": "web-01",
    "process_id": 12345,
    "revision": "a1b2c3d4",
    "user_agent": "Mozilla/5.0..."
  }
}

Use cases:
- Debugging specific error occurrences with full context
- Analyzing request parameters that triggered errors
- Understanding the exact code context where errors occurred
- Investigating user-specific error conditions
- Reproducing errors in development using actual request data`,
    {
      incidentId: z.string().describe('The unique identifier of the exception incident'),
      offset: z
        .number()
        .int()
        .min(0)
        .default(0)
        .describe('Sample index to retrieve (0 for most recent, 1 for second most recent, etc.)'),
    },
    async ({ incidentId, offset }) => {
      const appId = getSelectedAppId() || process.env.APPSIGNAL_APP_ID;
      if (!appId) {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: No app ID selected. Please use select_app_id tool first or set APPSIGNAL_APP_ID environment variable.',
            },
          ],
        };
      }

      try {
        const client = clientFactory();
        const sample = await client.getExceptionIncidentSample(incidentId, offset);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sample, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching exception incident sample: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
