import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getEffectiveAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

const PARAM_DESCRIPTIONS = {
  query:
    'The GraphQL query string to execute. Must be a valid GraphQL query following the AppSignal schema.',
  variables:
    'Optional JSON object containing variables for the query. Keys should match variable names defined in the query (without the $ prefix).',
} as const;

export function customGraphqlQueryTool(_server: McpServer, clientFactory: () => IAppsignalClient) {
  const CustomGraphqlQueryShape = {
    query: z.string().describe(PARAM_DESCRIPTIONS.query),
    variables: z.record(z.unknown()).optional().describe(PARAM_DESCRIPTIONS.variables),
  };

  const CustomGraphqlQuerySchema = z.object(CustomGraphqlQueryShape);

  return {
    name: 'custom_graphql_query',
    description: `Execute a custom GraphQL query against the AppSignal API. This is a powerful escape hatch for accessing data not available through the specialized tools.

IMPORTANT: Before using this tool:
1. Call get_graphql_schema to understand available types and queries
2. Call get_graphql_schema_details with relevant type names to see field definitions
3. Construct your query based on the schema

The AppSignal GraphQL API structure:
- Most data is accessed through: viewer { organizations { apps { ... } } }
- Use the app ID (available via get_apps or select_app_id) to filter to the correct app
- Common entry points: app(id: "..."), viewer, organization(slug: "...")

Example query to get exception incidents:
{
  "query": "query GetIncidents($appId: String!) { app(id: $appId) { exceptionIncidents(limit: 5, state: OPEN) { number exceptionName exceptionMessage count lastOccurredAt } } }",
  "variables": { "appId": "your-app-id" }
}

Example query to get app metrics:
{
  "query": "query { viewer { organizations { apps { id name metrics { timeline(name: \\"transaction_duration\\", timeframe: R1H) { start end } } } } } }"
}

PREFER SPECIALIZED TOOLS: Use get_exception_incidents, search_logs, get_metrics, etc. for common operations. Only use custom queries when:
- Specialized tools don't provide needed data
- You need custom field selections
- You're combining data in unique ways
- You're exploring API capabilities

Note: The currently selected app ID is automatically available. Use $appId variable and pass appId in variables if needed, or the tool will inject it for queries that need it.`,
    inputSchema: CustomGraphqlQueryShape,
    handler: async (args: unknown) => {
      const { query, variables } = CustomGraphqlQuerySchema.parse(args);
      const appId = getEffectiveAppId();

      // Inject appId into variables if not explicitly provided and query seems to need it
      // Use 'in' check to respect user-provided null/undefined values
      const finalVariables = { ...variables };
      if (appId && query.includes('$appId') && !('appId' in finalVariables)) {
        finalVariables.appId = appId;
      }

      try {
        const client = clientFactory();
        const result = await client.executeCustomQuery(query, finalVariables);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Provide helpful error context
        let helpText = '';
        if (errorMessage.includes('Cannot query field')) {
          helpText =
            "\n\nTip: Use get_graphql_schema_details to check available fields for the type you're querying.";
        } else if (errorMessage.includes('Variable') && errorMessage.includes('required')) {
          helpText =
            '\n\nTip: Make sure all required variables are provided in the variables parameter.';
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Error executing GraphQL query: ${errorMessage}${helpText}`,
            },
          ],
        };
      }
    },
  };
}
