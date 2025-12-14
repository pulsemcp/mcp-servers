# Cloud Storage MCP Server

MCP server for cloud storage operations. Currently supports Google Cloud Storage (GCS) with planned support for AWS S3 in the future.

## Highlights

- Full CRUD operations for cloud storage files (save, get, search, delete)
- Files exposed as MCP Resources for easy browsing
- Support for both inline content and local file references (preserves context window for large/binary files)
- Flexible authentication options (service account key file or default credentials)
- Optional root directory scoping within a bucket
- Tool grouping for permission-based access control

## Capabilities

### Tools

| Tool           | Group        | Description                                                  |
| -------------- | ------------ | ------------------------------------------------------------ |
| `save_file`    | write, admin | Save a file to cloud storage (inline content or local file)  |
| `get_file`     | readonly+    | Get a file from cloud storage (inline or save to local file) |
| `search_files` | readonly+    | Search/list files with prefix filtering and pagination       |
| `delete_file`  | admin        | Delete a file from cloud storage                             |

### Resources

Files in the cloud storage bucket are automatically exposed as MCP resources:

| Resource                      | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `cloud-storage://config`      | Server configuration and status (for debugging) |
| `cloud-storage://file/{path}` | Individual files in the bucket                  |

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable:

| Group      | Description                                      |
| ---------- | ------------------------------------------------ |
| `readonly` | Read-only operations (get_file, search_files)    |
| `write`    | Write operations (includes readonly + save_file) |
| `admin`    | All operations (includes write + delete_file)    |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only read operations
- `ENABLED_TOOLGROUPS="readonly,write"` - Read and write, no delete
- Not set - All tools enabled (default)

## Configuration

### Environment Variables

| Variable             | Required | Description                                  | Default            |
| -------------------- | -------- | -------------------------------------------- | ------------------ |
| `GCS_BUCKET`         | Yes      | Google Cloud Storage bucket name             | -                  |
| `GCS_ROOT_DIRECTORY` | No       | Optional root directory prefix in the bucket | Bucket root        |
| `GCS_PROJECT_ID`     | No       | Google Cloud project ID                      | From default creds |
| `GCS_KEY_FILE`       | No       | Path to service account JSON key file        | Uses default creds |
| `ENABLED_TOOLGROUPS` | No       | Comma-separated tool groups to enable        | All enabled        |
| `SKIP_HEALTH_CHECKS` | No       | Skip bucket connectivity check at startup    | `false`            |

### Authentication

The server supports two authentication methods:

1. **Service Account Key File**: Set `GCS_KEY_FILE` to the path of your service account JSON key file
2. **Default Credentials**: If `GCS_KEY_FILE` is not set, the server uses Google Cloud's [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials)

### Claude Desktop Configuration

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cloud-storage": {
      "command": "npx",
      "args": ["-y", "@pulsemcp/cloud-storage"],
      "env": {
        "GCS_BUCKET": "my-bucket-name",
        "GCS_KEY_FILE": "/path/to/service-account-key.json",
        "GCS_ROOT_DIRECTORY": "optional/prefix"
      }
    }
  }
}
```

## Usage Examples

### Save a File (inline content)

```
Use the save_file tool to save a configuration file:
- path: "config/settings.json"
- content: "{\"debug\": true, \"version\": \"1.0\"}"
- content_type: "application/json"
```

### Save a File (from local file)

```
Use the save_file tool to upload an image:
- path: "images/logo.png"
- local_file_path: "/tmp/logo.png"
```

### Get a File

```
Use the get_file tool to retrieve a file:
- path: "config/settings.json"
```

### Get a Binary File (preserve context window)

```
Use the get_file tool to download an image:
- path: "images/logo.png"
- local_file_path: "/tmp/downloaded-logo.png"
```

### Search Files

```
Use the search_files tool to list files:
- prefix: "documents/"
- limit: 50
```

### Delete a File

```
Use the delete_file tool:
- path: "temp/old-file.txt"
```

## Future Work

- **AWS S3 Support**: Add S3StorageClient implementation with similar interface
- **Azure Blob Storage**: Potential future support for Azure Blob Storage
- **File Versioning**: Support for bucket versioning features
- **Signed URLs**: Generate temporary signed URLs for file sharing

## Development

### Building

```bash
npm run build
```

### Testing

```bash
# Run functional tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests (requires GCS credentials)
npm run test:manual
```

## License

MIT
