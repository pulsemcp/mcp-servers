import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function searchLogsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'search_logs',
    `Search through application logs in AppSignal with powerful filtering capabilities. This tool allows you to query logs by content, filter by severity levels, and retrieve recent log entries matching your criteria. It's essential for troubleshooting specific issues, analyzing application behavior, and investigating error conditions.

Note that it can be very helpful to use start/end parameters around the time of an incident to pull together all the context on it. Generally, you probably want 10 seconds leading up to the incident through 3 seconds after it; and then expand from there if that's not enough context.

Example response:
{
  "logs": [
    {
      "timestamp": "2024-01-15T16:45:32.123Z",
      "severity": "error",
      "message": "Failed to process payment: Gateway timeout",
      "source": "app.payment.processor",
      "metadata": {
        "order_id": "ORD-12345",
        "amount": 99.99,
        "gateway": "stripe",
        "error_code": "timeout_error"
      },
      "hostname": "api-server-01",
      "trace_id": "abc123def456"
    },
    {
      "timestamp": "2024-01-15T16:44:28.456Z",
      "severity": "warn",
      "message": "Retry attempt 2/3 for payment processing",
      "source": "app.payment.processor",
      "metadata": {
        "order_id": "ORD-12345",
        "retry_delay": 5000
      },
      "hostname": "api-server-01",
      "trace_id": "abc123def456"
    }
  ],
  "totalCount": 127,
  "hasMore": true
}

Severity levels:
- debug: Detailed information for debugging
- info: General informational messages
- warn: Warning messages indicating potential issues
- error: Error messages for failures that don't stop the app
- fatal: Critical errors that cause application crashes

Use cases:
- Searching for specific error messages or patterns
- Investigating issues for particular users or transactions
- Analyzing log patterns around specific time periods
- Debugging by following trace IDs across services
- Filtering logs by severity to focus on critical issues`,
    {
      query: z
        .string()
        .describe(
          'Search query to filter logs (e.g., "payment failed", "user_id:123", "error_code:timeout")'
        ),
      limit: z
        .number()
        .int()
        .positive()
        .default(50)
        .describe('Maximum number of log entries to return (default: 50, max: 1000)'),
      severities: z
        .array(z.enum(['debug', 'info', 'warn', 'error', 'fatal']))
        .optional()
        .describe('Filter by severity levels. If not specified, returns logs of all severities'),
      start: z
        .string()
        .optional()
        .describe(
          'Start time for the search window in ISO 8601 format (e.g., "2024-01-15T00:00:00Z")'
        ),
      end: z
        .string()
        .optional()
        .describe(
          'End time for the search window in ISO 8601 format (e.g., "2024-01-15T23:59:59Z")'
        ),
    },
    async ({ query, limit, severities, start, end }) => {
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
        const logs = await client.searchLogs(query, limit, severities, start, end);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(logs, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error searching logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
