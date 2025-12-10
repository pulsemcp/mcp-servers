import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';
import { getCachedSchemaContent } from './get-graphql-schema.js';

const PARAM_DESCRIPTIONS = {
  typeNames:
    'Array of GraphQL type names to retrieve full definitions for (e.g., ["App", "ExceptionIncident", "IncidentStateEnum"])',
} as const;

interface TypeDefinition {
  name: string;
  kind: string;
  definition: string;
}

/**
 * Extract full definitions for specific types from the schema
 */
function extractTypeDefinitions(schemaContent: string, typeNames: string[]): TypeDefinition[] {
  const definitions: TypeDefinition[] = [];
  // Use case-sensitive matching for GraphQL type names (GraphQL is case-sensitive)
  const typeNamesSet = new Set(typeNames);

  // Pattern to match any top-level definition with its full body
  // This handles types, inputs, enums, interfaces, unions, and scalars
  const definitionPattern =
    /(?:(?:"""[\s\S]*?"""\s+)?)(type|input|enum|interface|union|scalar)\s+(\w+)(?:\s+implements\s+[\w\s&]+)?(?:\s*=\s*[^\n]+|\s*\{[\s\S]*?\n\})?/g;

  let match;
  while ((match = definitionPattern.exec(schemaContent)) !== null) {
    const [fullMatch, kind, name] = match;
    if (typeNamesSet.has(name)) {
      definitions.push({
        name,
        kind,
        definition: fullMatch.trim(),
      });
    }
  }

  // Check for types that weren't found (case-sensitive comparison)
  const foundNames = new Set(definitions.map((d) => d.name));
  const notFound = typeNames.filter((n) => !foundNames.has(n));

  if (notFound.length > 0) {
    definitions.push({
      name: '_errors',
      kind: 'error',
      definition: `Types not found: ${notFound.join(', ')}`,
    });
  }

  return definitions;
}

export function getGraphqlSchemaDetailsTool(
  _server: McpServer,
  _clientFactory: () => IAppsignalClient
) {
  const GetGraphqlSchemaDetailsShape = {
    typeNames: z.array(z.string()).min(1).describe(PARAM_DESCRIPTIONS.typeNames),
  };

  const GetGraphqlSchemaDetailsSchema = z.object(GetGraphqlSchemaDetailsShape);

  return {
    name: 'get_graphql_schema_details',
    description: `Returns full GraphQL type definitions for the specified type names. Use this after get_graphql_schema to get detailed field information for types you need in your custom query.

This tool provides the complete schema definition including:
- All fields with their types and arguments
- Field descriptions and documentation
- Enum values
- Interface implementations
- Input object fields

Example usage:
- To understand App fields: typeNames: ["App"]
- To understand incident types: typeNames: ["ExceptionIncident", "PerformanceIncident", "IncidentStateEnum"]
- To understand metric queries: typeNames: ["Metrics", "Timeseries", "TimeframeEnum"]

Workflow:
1. First call get_graphql_schema to see all available types
2. Identify which types you need for your query
3. Call this tool with those type names
4. Use the definitions to construct your custom_graphql_query

Tip: Include related enums and input types to understand valid parameter values.`,
    inputSchema: GetGraphqlSchemaDetailsShape,
    handler: async (args: unknown) => {
      const { typeNames } = GetGraphqlSchemaDetailsSchema.parse(args);

      try {
        // Use cached schema content to avoid re-reading from disk
        const schemaContent = getCachedSchemaContent();
        const definitions = extractTypeDefinitions(schemaContent, typeNames);

        const output = {
          message: `Full definitions for ${typeNames.length} requested type(s)`,
          definitions: definitions.map((d) => ({
            name: d.name,
            kind: d.kind,
            definition: d.definition,
          })),
        };

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(output, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error reading GraphQL schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    },
  };
}
