# DynamoDB MCP Server

An MCP server for AWS DynamoDB with fine-grained tool control. Provides comprehensive DynamoDB operations with configurable access levels.

## Features

- **Complete DynamoDB Operations**: Tables, items, queries, scans, and batch operations
- **Fine-grained Access Control**: Enable/disable tools by group or individually
- **Table-level Access Control**: Restrict operations to specific tables
- **AWS Credential Support**: Works with explicit credentials or AWS credential chain
- **Custom Endpoints**: Support for local DynamoDB or LocalStack

## Available Tools

### Readonly Tools (Group: `readonly`)

| Tool                       | Description                              |
| -------------------------- | ---------------------------------------- |
| `dynamodb_list_tables`     | List all DynamoDB tables with pagination |
| `dynamodb_describe_table`  | Get table metadata, schema, and indexes  |
| `dynamodb_get_item`        | Retrieve single item by primary key      |
| `dynamodb_query_items`     | Query items using key conditions         |
| `dynamodb_scan_table`      | Scan table with optional filters         |
| `dynamodb_batch_get_items` | Get multiple items across tables         |

### ReadWrite Tools (Group: `readwrite`)

| Tool                         | Description                 |
| ---------------------------- | --------------------------- |
| `dynamodb_put_item`          | Create or replace an item   |
| `dynamodb_update_item`       | Update specific attributes  |
| `dynamodb_delete_item`       | Delete item by primary key  |
| `dynamodb_batch_write_items` | Batch put/delete operations |

### Admin Tools (Group: `admin`)

| Tool                    | Description                 |
| ----------------------- | --------------------------- |
| `dynamodb_create_table` | Create a new table          |
| `dynamodb_delete_table` | Delete a table and all data |
| `dynamodb_update_table` | Update table settings       |

## Configuration

### Environment Variables

| Variable                       | Required | Description                                              |
| ------------------------------ | -------- | -------------------------------------------------------- |
| `AWS_REGION`                   | Yes      | AWS region (or `AWS_DEFAULT_REGION`)                     |
| `AWS_ACCESS_KEY_ID`            | No       | AWS access key (uses credential chain if not set)        |
| `AWS_SECRET_ACCESS_KEY`        | No       | AWS secret key (uses credential chain if not set)        |
| `DYNAMODB_ENDPOINT`            | No       | Custom endpoint (for local DynamoDB)                     |
| `DYNAMODB_ENABLED_TOOL_GROUPS` | No       | Comma-separated groups: `readonly`, `readwrite`, `admin` |
| `DYNAMODB_ENABLED_TOOLS`       | No       | Whitelist specific tools                                 |
| `DYNAMODB_DISABLED_TOOLS`      | No       | Blacklist specific tools                                 |
| `DYNAMODB_ALLOWED_TABLES`      | No       | Restrict operations to specific tables (comma-separated) |

### Tool Access Control

Control which tools are available using three methods:

**1. Tool Groups** (recommended for most cases):

```bash
# Read-only access
DYNAMODB_ENABLED_TOOL_GROUPS="readonly"

# Read and write, no table management
DYNAMODB_ENABLED_TOOL_GROUPS="readonly,readwrite"

# All operations (default)
DYNAMODB_ENABLED_TOOL_GROUPS="readonly,readwrite,admin"
```

**2. Whitelist Specific Tools**:

```bash
# Only allow specific operations
DYNAMODB_ENABLED_TOOLS="dynamodb_get_item,dynamodb_query,dynamodb_scan"
```

**3. Blacklist Specific Tools**:

```bash
# Enable all except dangerous operations
DYNAMODB_DISABLED_TOOLS="dynamodb_delete_table,dynamodb_create_table"
```

**Priority**: `DYNAMODB_ENABLED_TOOLS` > `DYNAMODB_DISABLED_TOOLS` > `DYNAMODB_ENABLED_TOOL_GROUPS`

### Table-level Access Control

Restrict all operations to specific tables only:

```bash
# Only allow access to Users and Orders tables
DYNAMODB_ALLOWED_TABLES="Users,Orders"
```

When `DYNAMODB_ALLOWED_TABLES` is set:

- `list_tables` only returns tables in the allowed list
- Operations on non-allowed tables return an "Access denied" error
- Batch operations fail if any table in the request is not allowed
- Table names are matched **case-sensitively** (DynamoDB table names are case-sensitive)
- When using pagination with `list_tables`, the `limit` applies before filtering

**Note:** If not set or set to an empty string, all tables are accessible (no filtering).

This is useful for:

- Multi-tenant environments where each client should only access their tables
- Development environments where you want to protect production tables
- Limiting the blast radius of AI agents to specific tables

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "dynamodb": {
      "command": "npx",
      "args": ["-y", "dynamodb-mcp-server"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "your-access-key",
        "AWS_SECRET_ACCESS_KEY": "your-secret-key",
        "DYNAMODB_ENABLED_TOOL_GROUPS": "readonly,readwrite"
      }
    }
  }
}
```

### Using Local DynamoDB

For development with local DynamoDB or LocalStack:

```json
{
  "mcpServers": {
    "dynamodb-local": {
      "command": "npx",
      "args": ["-y", "dynamodb-mcp-server"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "local",
        "AWS_SECRET_ACCESS_KEY": "local",
        "DYNAMODB_ENDPOINT": "http://localhost:8000"
      }
    }
  }
}
```

## Examples

### Query Items

```
Query all orders for customer "C123" from the last 30 days:
- Table: Orders
- Key condition: customerId = :cid AND orderDate > :date
- Values: {":cid": "C123", ":date": "2025-01-01"}
```

### Create Table

```
Create a Users table with:
- Partition key: userId (String)
- Billing: Pay per request
```

### Batch Operations

```
Get user profiles for IDs: user1, user2, user3 from the Users table
```

## Development

### Setup

```bash
cd experimental/dynamodb
npm run install-all
npm run build
```

### Testing

```bash
# Unit tests
npm run test:run

# Integration tests
npm run test:integration

# Manual tests (requires AWS credentials)
npm run test:manual
```

## Resources

| Resource            | Description                                  |
| ------------------- | -------------------------------------------- |
| `dynamodb://config` | Server configuration and tool group mappings |

## License

MIT
