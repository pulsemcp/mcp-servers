# GCS MCP Server

MCP server for Google Cloud Storage operations with fine-grained tool access control. Supports read/write operations on GCS buckets and objects, with configurable tool groups for security and permission management.

## Highlights

- Full GCS bucket and object management (list, get, put, copy, delete)
- Fine-grained access control with tool groups (readonly, readwrite)
- Individual tool enable/disable via environment variables
- Multiple authentication methods (service account key file, inline JSON, ADC)
- GCS credential validation with health checks
- Single bucket constraint mode
- TypeScript with strict type checking
- Comprehensive testing (functional, integration, manual)

## Capabilities

### Tools

| Tool            | Group     | Description                                         |
| --------------- | --------- | --------------------------------------------------- |
| `list_buckets`  | readonly  | List all GCS buckets in the Google Cloud project    |
| `list_objects`  | readonly  | List objects in a bucket with prefix and pagination |
| `get_object`    | readonly  | Get object contents as text                         |
| `head_bucket`   | readonly  | Check if a bucket exists and is accessible          |
| `put_object`    | readwrite | Upload or update an object                          |
| `delete_object` | readwrite | Delete an object from a bucket                      |
| `copy_object`   | readwrite | Copy an object within or across buckets             |
| `create_bucket` | readwrite | Create a new GCS bucket                             |
| `delete_bucket` | readwrite | Delete an empty GCS bucket                          |

### Resources

| Resource       | Description                                     |
| -------------- | ----------------------------------------------- |
| `gcs://config` | Server configuration and status (for debugging) |

### Tool Groups

Control which tools are available via the `GCS_ENABLED_TOOLGROUPS` environment variable:

| Group       | Description                                  |
| ----------- | -------------------------------------------- |
| `readonly`  | Read-only operations (list, get, head)       |
| `readwrite` | Write operations (put, delete, copy, create) |

**Examples:**

- `GCS_ENABLED_TOOLGROUPS="readonly"` - Only read operations
- `GCS_ENABLED_TOOLGROUPS="readonly,readwrite"` - All operations
- Not set - All tools enabled (default)

### Individual Tool Control

Fine-grained control over specific tools:

- `GCS_ENABLED_TOOLS="list_buckets,get_object"` - Only enable these tools
- `GCS_DISABLED_TOOLS="delete_bucket,delete_object"` - Disable these tools

### Single Bucket Mode

Constrain all operations to a specific bucket using `GCS_BUCKET`:

```bash
GCS_BUCKET="my-bucket"
```

When set:

- All object operations are automatically scoped to this bucket
- Bucket-level tools (`list_buckets`, `create_bucket`, `delete_bucket`, `head_bucket`) are hidden
- The `bucket` parameter is automatically injected and hidden from tool inputs
- For `copy_object`, both source and destination are constrained to the specified bucket

This is useful for restricting access to a single bucket without giving broader GCS permissions.

## Quick Start

### Configuration

#### Environment Variables

| Variable                       | Required | Description                                | Default     |
| ------------------------------ | -------- | ------------------------------------------ | ----------- |
| `GCS_PROJECT_ID`               | Yes      | Google Cloud project ID                    | -           |
| `GCS_SERVICE_ACCOUNT_KEY_FILE` | No       | Path to service account key JSON file      | -           |
| `GCS_SERVICE_ACCOUNT_KEY_JSON` | No       | Service account key JSON contents (inline) | -           |
| `GCS_BUCKET`                   | No       | Constrain operations to single bucket      | -           |
| `GCS_ENABLED_TOOLGROUPS`       | No       | Comma-separated tool groups                | All enabled |
| `GCS_ENABLED_TOOLS`            | No       | Specific tools to enable                   | -           |
| `GCS_DISABLED_TOOLS`           | No       | Specific tools to disable                  | -           |
| `SKIP_HEALTH_CHECKS`           | No       | Skip credential validation                 | `false`     |

#### Authentication

The server supports three authentication methods (in order of precedence):

1. **Service Account Key File**: Set `GCS_SERVICE_ACCOUNT_KEY_FILE` to the path of a JSON key file
2. **Inline Service Account Key**: Set `GCS_SERVICE_ACCOUNT_KEY_JSON` with the JSON contents directly
3. **Application Default Credentials (ADC)**: No additional env vars needed - uses `gcloud auth application-default login`

### Claude Desktop Configuration

If this is your first time using MCP Servers, make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "gcs": {
      "command": "npx",
      "args": ["-y", "gcs-google-mcp-server"],
      "env": {
        "GCS_PROJECT_ID": "your-project-id",
        "GCS_SERVICE_ACCOUNT_KEY_FILE": "/path/to/service-account-key.json",
        "GCS_ENABLED_TOOLGROUPS": "readonly"
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
    "GCS_ENABLED_TOOLGROUPS": "readonly"
  }
}
```

### Using Application Default Credentials

If you have `gcloud` CLI configured locally:

```bash
gcloud auth application-default login
```

Then configure without key file:

```json
{
  "env": {
    "GCS_PROJECT_ID": "your-project-id"
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

# Run manual tests (real GCS - requires .env)
npm run test:manual:setup  # First time only
npm run test:manual

# Run all automated tests
npm run test:all
```

### Manual Testing Setup

Create a `.env` file in the gcs directory:

```bash
GCS_PROJECT_ID=your-project-id
GCS_SERVICE_ACCOUNT_KEY_FILE=/path/to/service-account-key.json
```

Then run:

```bash
npm run test:manual
```

## Project Structure

```
gcs/
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
│   │   ├── gcs-client/   # Google Cloud Storage client wrapper
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
