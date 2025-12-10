import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of this module to find the schema file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SCHEMA_PATH = join(__dirname, '..', 'graphql', 'schema.graphql');

// Cache for parsed schema to avoid re-reading on every request
let cachedSchemaContent: string | null = null;
let cachedSchemaSummary: SchemaSummary | null = null;

/**
 * Get the cached schema content, reading from disk only once
 */
export function getCachedSchemaContent(): string {
  if (!cachedSchemaContent) {
    cachedSchemaContent = readFileSync(SCHEMA_PATH, 'utf-8');
  }
  return cachedSchemaContent;
}

interface TypeSummary {
  name: string;
  kind: 'type' | 'input' | 'enum' | 'interface' | 'union' | 'scalar';
  description?: string;
  fieldCount?: number;
}

interface SchemaSummary {
  queryFields: Array<{ name: string; description?: string }>;
  mutationFields: Array<{ name: string; description?: string }>;
  types: TypeSummary[];
}

/**
 * Parse the GraphQL schema and extract a summary of types
 */
function parseSchemaForSummary(schemaContent: string): SchemaSummary {
  const types: TypeSummary[] = [];
  const queryFields: Array<{ name: string; description?: string }> = [];
  const mutationFields: Array<{ name: string; description?: string }> = [];

  // Regex patterns for different GraphQL constructs
  const typePattern =
    /(?:"""([^"]*?)"""\s+)?type\s+(\w+)(?:\s+implements\s+[\w\s&]+)?\s*\{([^}]*)\}/gs;
  const inputPattern = /(?:"""([^"]*?)"""\s+)?input\s+(\w+)\s*\{([^}]*)\}/gs;
  const enumPattern = /(?:"""([^"]*?)"""\s+)?enum\s+(\w+)\s*\{([^}]*)\}/gs;
  const interfacePattern = /(?:"""([^"]*?)"""\s+)?interface\s+(\w+)\s*\{([^}]*)\}/gs;
  const unionPattern = /(?:"""([^"]*?)"""\s+)?union\s+(\w+)\s*=\s*([^\n]+)/gs;
  const scalarPattern = /(?:"""([^"]*?)"""\s+)?scalar\s+(\w+)/gs;

  // Extract types
  let match;
  while ((match = typePattern.exec(schemaContent)) !== null) {
    const [, description, name, body] = match;
    const fieldCount = (body.match(/^\s*\w+[\s(]/gm) || []).length;

    if (name === 'Query') {
      // Extract query fields with descriptions
      const fieldPattern = /(?:"""([^"]*?)"""\s+)?(\w+)(?:\([^)]*\))?:/gs;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(body)) !== null) {
        queryFields.push({
          name: fieldMatch[2],
          description: fieldMatch[1]?.trim(),
        });
      }
    } else if (name === 'Mutation') {
      // Extract mutation fields with descriptions
      const fieldPattern = /(?:"""([^"]*?)"""\s+)?(\w+)(?:\([^)]*\))?:/gs;
      let fieldMatch;
      while ((fieldMatch = fieldPattern.exec(body)) !== null) {
        mutationFields.push({
          name: fieldMatch[2],
          description: fieldMatch[1]?.trim(),
        });
      }
    } else {
      types.push({
        name,
        kind: 'type',
        description: description?.trim(),
        fieldCount,
      });
    }
  }

  // Extract inputs
  while ((match = inputPattern.exec(schemaContent)) !== null) {
    const [, description, name, body] = match;
    const fieldCount = (body.match(/^\s*\w+:/gm) || []).length;
    types.push({
      name,
      kind: 'input',
      description: description?.trim(),
      fieldCount,
    });
  }

  // Extract enums
  while ((match = enumPattern.exec(schemaContent)) !== null) {
    const [, description, name, body] = match;
    const fieldCount = (body.match(/^\s*\w+/gm) || []).length;
    types.push({
      name,
      kind: 'enum',
      description: description?.trim(),
      fieldCount,
    });
  }

  // Extract interfaces
  while ((match = interfacePattern.exec(schemaContent)) !== null) {
    const [, description, name, body] = match;
    const fieldCount = (body.match(/^\s*\w+[\s(]/gm) || []).length;
    types.push({
      name,
      kind: 'interface',
      description: description?.trim(),
      fieldCount,
    });
  }

  // Extract unions
  while ((match = unionPattern.exec(schemaContent)) !== null) {
    const [, description, name] = match;
    types.push({
      name,
      kind: 'union',
      description: description?.trim(),
    });
  }

  // Extract scalars
  while ((match = scalarPattern.exec(schemaContent)) !== null) {
    const [, description, name] = match;
    types.push({
      name,
      kind: 'scalar',
      description: description?.trim(),
    });
  }

  // Sort types alphabetically by name
  types.sort((a, b) => a.name.localeCompare(b.name));

  return { queryFields, mutationFields, types };
}

export function getGraphqlSchemaTool(_server: McpServer, _clientFactory: () => IAppsignalClient) {
  const GetGraphqlSchemaShape = {};

  return {
    name: 'get_graphql_schema',
    description: `Returns a summary of the AppSignal GraphQL API schema, including available Query fields, Mutation fields, and all type definitions with their names, kinds, and descriptions.

This is a discovery tool - use it BEFORE constructing a custom_graphql_query to understand what data is available. The summary provides:
- Query fields: What data you can fetch (app, organization, viewer, timezones)
- Mutation fields: What actions you can perform
- Types: All available types with their kind (type/input/enum/interface/union/scalar) and field counts

After reviewing this summary, use get_graphql_schema_details with specific type names to see full field definitions before writing your query.

IMPORTANT: Prefer using the other specialized tools (get_exception_incident, search_logs, get_metrics, etc.) for common operations. Only use custom GraphQL queries when:
- The specialized tools don't provide the data you need
- You need to combine data in ways the tools don't support
- You're exploring capabilities not covered by existing tools

Example workflow:
1. Call get_graphql_schema to see available types
2. Call get_graphql_schema_details with types you need (e.g., ["App", "ExceptionIncident"])
3. Construct and execute your query with custom_graphql_query`,
    inputSchema: GetGraphqlSchemaShape,
    handler: async () => {
      try {
        // Use cached data if available to avoid re-reading and re-parsing
        if (!cachedSchemaSummary) {
          const schemaContent = getCachedSchemaContent();
          cachedSchemaSummary = parseSchemaForSummary(schemaContent);
        }
        const summary = cachedSchemaSummary;

        const output = {
          message:
            'AppSignal GraphQL Schema Summary. Use get_graphql_schema_details with specific type names to see full definitions.',
          queryFields: summary.queryFields,
          mutationFields: summary.mutationFields,
          types: summary.types.map((t) => ({
            name: t.name,
            kind: t.kind,
            description: t.description || null,
            fieldCount: t.fieldCount || null,
          })),
          typeCount: summary.types.length,
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
