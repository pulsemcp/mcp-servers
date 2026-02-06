# S3 MCP Server

MCP server for AWS S3 operations with fine-grained tool access control. Supports read/write operations on S3 buckets and objects, with configurable tool groups for security and permission management.

## Highlights

- Full S3 bucket and object management (list, get, put, copy, delete)
- Fine-grained access control with tool groups (readonly, readwrite)
- Individual tool enable/disable via environment variables
- AWS credential validation with health checks
- S3-compatible endpoint support (MinIO, LocalStack, etc.)
- TypeScript with strict type checking
- Comprehensive testing (functional, integration, manual)

## Capabilities

### Tools

| Tool            | Group     | Description                                         |
| --------------- | --------- | --------------------------------------------------- |
| `list_buckets`  | readonly  | List all S3 buckets in the AWS account              |
| `list_objects`  | readonly  | List objects in a bucket with prefix and pagination |
| `get_object`    | readonly  | Get object contents as text                         |
| `head_bucket`   | readonly  | Check if a bucket exists and is accessible          |
| `put_object`    | readwrite | Upload or update an object                          |
| `delete_object` | readwrite | Delete an object from a bucket                      |
| `copy_object`   | readwrite | Copy an object within or across buckets             |
| `create_bucket` | readwrite | Create a new S3 bucket                              |
| `delete_bucket` | readwrite | Delete an empty S3 bucket                           |

### Resources

| Resource      | Description                                     |
| ------------- | ----------------------------------------------- |
| `s3://config` | Server configuration and status (for debugging) |

### Tool Groups

Control which tools are available via the `S3_ENABLED_TOOLGROUPS` environment variable:

| Group       | Description                                  |
| ----------- | -------------------------------------------- |
| `readonly`  | Read-only operations (list, get, head)       |
| `readwrite` | Write operations (put, delete, copy, create) |

**Examples:**

- `S3_ENABLED_TOOLGROUPS="readonly"` - Only read operations
- `S3_ENABLED_TOOLGROUPS="readonly,readwrite"` - All operations
- Not set - All tools enabled (default)

### Individual Tool Control

Fine-grained control over specific tools:

- `S3_ENABLED_TOOLS="list_buckets,get_object"` - Only enable these tools
- `S3_DISABLED_TOOLS="delete_bucket,delete_object"` - Disable these tools

### Single Bucket Mode

Constrain all operations to a specific bucket using `S3_BUCKET`:

```bash
S3_BUCKET="my-bucket"
```

When set:

- All object operations are automatically scoped to this bucket
- Bucket-level tools (`list_buckets`, `create_bucket`, `delete_bucket`, `head_bucket`) are hidden
- The `bucket` parameter is automatically injected and hidden from tool inputs
- For `copy_object`, both source and destination are constrained to the specified bucket

This is useful for restricting access to a single bucket without giving broader S3 permissions.

## Quick Start

### Configuration

#### Environment Variables

| Variable                | Required | Description                           | Default     |
| ----------------------- | -------- | ------------------------------------- | ----------- |
| `AWS_ACCESS_KEY_ID`     | Yes      | AWS access key ID                     | -           |
| `AWS_SECRET_ACCESS_KEY` | Yes      | AWS secret access key                 | -           |
| `AWS_REGION`            | No       | AWS region for S3 operations          | `us-east-1` |
| `AWS_ENDPOINT_URL`      | No       | Custom S3 endpoint (for MinIO, etc.)  | -           |
| `S3_BUCKET`             | No       | Constrain operations to single bucket | -           |
| `S3_ENABLED_TOOLGROUPS` | No       | Comma-separated tool groups           | All enabled |
| `S3_ENABLED_TOOLS`      | No       | Specific tools to enable              | -           |
| `S3_DISABLED_TOOLS`     | No       | Specific tools to disable             | -           |
| `SKIP_HEALTH_CHECKS`    | No       | Skip credential validation            | `false`     |

### Claude Desktop Configuration

If this is your first time using MCP Servers, make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "s3": {
      "command": "npx",
      "args": ["-y", "s3-aws-mcp-server"],
      "env": {
        "AWS_ACCESS_KEY_ID": "your-access-key-id",
        "AWS_SECRET_ACCESS_KEY": "your-secret-access-key",
        "AWS_REGION": "us-east-1",
        "S3_ENABLED_TOOLGROUPS": "readonly"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

### Read-Only Mode

For safer exploration, enable only read operations:

```json
{
  "env": {
    "S3_ENABLED_TOOLGROUPS": "readonly"
  }
}
```

### Using with S3-Compatible Services

For MinIO, LocalStack, or other S3-compatible services:

```json
{
  "env": {
    "AWS_ACCESS_KEY_ID": "minioadmin",
    "AWS_SECRET_ACCESS_KEY": "minioadmin",
    "AWS_REGION": "us-east-1",
    "AWS_ENDPOINT_URL": "http://localhost:9000"
  }
}
```

## Development

### Install Dependencies

```bash
npm run install-all
```

### Build

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Testing

```bash
# Run functional tests
npm run test:run

# Run integration tests (full MCP protocol)
npm run test:integration

# Run manual tests (real AWS - requires .env)
npm run test:manual:setup  # First time only
npm run test:manual

# Run all automated tests
npm run test:all
```

### Manual Testing Setup

Create a `.env` file in the s3 directory:

```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

Then run:

```bash
npm run test:manual
```

## Project Structure

```
s3/
├── local/                 # Local server implementation
│   ├── src/
│   │   ├── index.ts      # Main entry point with env validation
│   │   └── index.integration-with-mock.ts
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── server.ts     # Server factory with DI
│   │   ├── tools.ts      # Tool registration with grouping
│   │   ├── tools/        # Individual tool implementations
│   │   ├── resources.ts  # Resource implementations
│   │   ├── s3-client/    # AWS S3 client wrapper
│   │   └── logging.ts
│   └── package.json
├── tests/                # Test suite
│   ├── functional/       # Unit tests with mocks
│   ├── integration/      # MCP protocol tests
│   ├── manual/          # Real API tests
│   └── mocks/           # Mock implementations
└── package.json         # Root workspace config
```

## License

MIT
