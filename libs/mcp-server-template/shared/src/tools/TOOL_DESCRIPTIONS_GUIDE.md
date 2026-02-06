# Tool Descriptions Guide

This guide provides comprehensive instructions for writing effective tool descriptions in MCP servers. Well-written tool descriptions are crucial for helping users understand and effectively use your MCP tools.

## Overview

Tool descriptions in MCP serve as the primary documentation that users see when listing available tools. They should be comprehensive, clear, and provide all necessary context for effective tool usage.

## Tool Naming Conventions

### Keep Tool Names Short (No Server Prefixes)

**Don't** prefix tool names with the server name (e.g., `dynamodb_get_item`, `appsignal_list_apps`).

**Do** use short, descriptive names (e.g., `get_item`, `list_apps`).

**Why?** Most MCP clients automatically prefix tool names with the server name when displaying them to users. For example, a tool named `get_item` in a DynamoDB server will appear as `dynamodb:get_item` or `dynamodb.get_item` to users. Adding your own prefix creates redundancy like `dynamodb:dynamodb_get_item`.

### Naming Best Practices

- Use `snake_case` for tool names
- Start with a verb describing the action: `get_`, `list_`, `create_`, `update_`, `delete_`, `search_`, `query_`
- Be specific but concise: `query_items` instead of just `query`
- Avoid abbreviations unless universally understood
- Keep names under 25 characters when possible

## Anatomy of a Good Tool Description

A complete tool description should include:

1. **Purpose Statement** - What the tool does
2. **Context** - Domain-specific context (e.g., "incident management", "monitoring")
3. **Example Response** - Realistic example of returned data
4. **Enum Explanations** - Clear meanings for all enum values
5. **Use Cases** - When and why to use the tool
6. **Parameter Descriptions** - Detailed explanations with examples

## Implementation Pattern

### Modern Pattern (Recommended)

Use this pattern for new tools, which provides better type safety and maintainability:

```typescript
// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  query: 'Search query to filter logs (e.g., "payment failed", "user_id:123")',
  limit: 'Maximum number of entries to return (default: 50, max: 1000)',
  severities: 'Filter by severity levels. If not specified, returns all severities',
} as const;

export function myTool(server: Server, clientFactory: () => IClient) {
  // Define Zod schema with descriptions
  const MyToolSchema = z.object({
    query: z.string().describe(PARAM_DESCRIPTIONS.query),
    limit: z.number().optional().describe(PARAM_DESCRIPTIONS.limit),
    severities: z
      .array(z.enum(['debug', 'info', 'warn', 'error', 'fatal']))
      .optional()
      .describe(PARAM_DESCRIPTIONS.severities),
  });

  return {
    name: 'tool_name',
    description: `[PURPOSE STATEMENT]
    
[EXAMPLE RESPONSE SECTION]

[ENUM EXPLANATIONS IF APPLICABLE]

[USE CASES SECTION]`,
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.query,
        },
        limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.limit,
        },
        severities: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['debug', 'info', 'warn', 'error', 'fatal'],
          },
          description: PARAM_DESCRIPTIONS.severities,
        },
      },
      required: ['query'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = MyToolSchema.parse(args);
      // Implementation using validatedArgs
    },
  };
}
```

### Legacy Pattern (server.tool method)

Some existing servers use this older pattern:

```typescript
export function myTool(server: McpServer, clientFactory: () => IClient) {
  return server.tool(
    'tool_name',
    `[PURPOSE STATEMENT]
    
[EXAMPLE RESPONSE SECTION]

[ENUM EXPLANATIONS IF APPLICABLE]

[USE CASES SECTION]`,
    {
      // Parameter schemas with detailed descriptions
    },
    async (params) => {
      // Implementation
    }
  );
}
```

## Section Guidelines

### 1. Purpose Statement (Required)

Start with 1-2 sentences clearly explaining what the tool does. Include:

- The action performed (retrieve, search, create, etc.)
- The type of data involved
- Any important capabilities or limitations

**Example:**

```
Retrieve detailed information about a specific anomaly incident in your AppSignal application.
Anomaly incidents are automatically detected unusual patterns in your application's
performance metrics, such as abnormal response times, memory usage spikes, or throughput variations.
```

### 2. Example Response (Required)

Provide a realistic JSON example showing:

- Actual field names and data types
- Representative values (not just "string" or 123)
- Common scenarios users will encounter
- Enough variety to show different states/types

**Format:**

```
Example response:
{
  "id": "anomaly-789",
  "type": "performance_anomaly",
  "metric": "response_time",
  "severity": "warning",
  "status": "OPEN",
  "detectedAt": "2024-01-15T10:30:00Z",
  "description": "Response time increased by 300% compared to baseline",
  "affectedEndpoint": "/api/users",
  "baselineValue": 150,
  "anomalyValue": 600,
  "unit": "ms"
}
```

### 3. Enum Explanations (When Applicable)

For any enum parameters or response fields, provide clear explanations:

**Format:**

```
State meanings:
- OPEN: New or unacknowledged items requiring attention
- WIP: Work in progress - items being investigated or addressed
- CLOSED: Resolved items or false positives

Severity levels:
- debug: Detailed information for debugging
- info: General informational messages
- warn: Warning messages indicating potential issues
- error: Error messages for failures that don't stop the app
- fatal: Critical errors that cause application crashes
```

### 4. Use Cases (Required)

List 4-6 concrete scenarios where the tool would be used. Focus on:

- Real-world tasks users need to accomplish
- Different perspectives (debugging, monitoring, analysis)
- Both common and advanced use cases

**Format:**

```
Use cases:
- Investigating specific performance anomalies flagged by the system
- Getting detailed metrics about unusual application behavior
- Understanding the scope and impact of detected anomalies
- Tracking the resolution status of performance issues
- Correlating anomalies with deployment or configuration changes
```

### 5. Parameter Descriptions

Each parameter should have a description that includes:

- What the parameter controls
- Valid values or formats
- Default values if applicable
- Examples of actual values

**Examples:**

```typescript
{
  query: z.string().describe(
    'Search query to filter logs (e.g., "payment failed", "user_id:123", "error_code:timeout")'
  ),

  limit: z.number().optional().describe(
    'Maximum number of incidents to return for pagination. Defaults to 50'
  ),

  states: z.array(z.enum(['OPEN', 'CLOSED', 'WIP'])).optional().describe(
    'Filter incidents by state(s). OPEN = new/unacknowledged, WIP = work in progress, ' +
    'CLOSED = resolved. Defaults to ["OPEN"] if not provided'
  ),

  severities: z.array(z.enum(['debug', 'info', 'warn', 'error', 'fatal'])).optional().describe(
    'Filter by severity levels. If not specified, returns logs of all severities'
  )
}
```

## Best Practices

### DO:

- Use concrete, realistic examples
- Explain domain-specific terms
- Include both simple and complex use cases
- Describe relationships between tools (e.g., "use get_apps before this tool")
- Mention any prerequisites or setup requirements
- Use consistent terminology across all tools

### DON'T:

- Use generic examples like "foo", "bar", "test123"
- Assume users understand your domain
- Write overly technical descriptions
- Forget to explain enum values
- Use different terms for the same concept

## Tool Categories

Consider organizing your descriptions by tool category:

### Discovery Tools

Tools for listing and discovering available resources.

- Emphasize that these are often used first
- Explain how results feed into other tools

### Detail Tools

Tools for getting specific information about a single resource.

- Reference how to get the IDs (from discovery tools)
- Show comprehensive response examples

### Action Tools

Tools that perform operations or searches.

- Clearly explain parameters and their effects
- Provide multiple query examples
- Show different response scenarios

### Configuration Tools

Tools for setting up or configuring the integration.

- Explain the flow (e.g., select app before using other tools)
- Describe what changes after configuration

## Length Guidelines

- **Simple tools** (no parameters): 8-15 lines
- **Standard tools** (1-3 parameters): 20-40 lines
- **Complex tools** (many parameters/options): 40-60 lines

## Testing Your Descriptions

Before finalizing, ensure your descriptions answer:

1. What does this tool do?
2. When would I use it?
3. What do I need to know before using it?
4. What will I get back?
5. What are all the options and what do they mean?

## Example: Complete Tool Description

```typescript
export function searchLogsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'search_logs',
    `Search through application logs in AppSignal with powerful filtering capabilities. This tool allows you to query logs by content, filter by severity levels, and retrieve recent log entries matching your criteria. It's essential for troubleshooting specific issues, analyzing application behavior, and investigating error conditions.

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
    },
    async ({ query, limit, severities }) => {
      // Implementation
    }
  );
}
```

This example demonstrates all the key elements of a well-documented tool.
