# File Upload MCP Server

An MCP server for uploading files to cloud storage providers. Currently supports Google Cloud Storage (GCS), with plans for S3, Cloudflare R2, and more.

## Features

- Upload files to Google Cloud Storage
- Accept `file://` URIs (e.g., from MCP resources) or base64-encoded data
- Automatic content type detection
- Public URL generation or signed URLs for private buckets
- Configurable base path prefix for organized storage

## Installation

```bash
npm install file-upload-mcp-server
```

Or run directly with npx:

```bash
npx file-upload-mcp-server
```

## Configuration

### Environment Variables

| Variable                         | Required | Description                    | Default          |
| -------------------------------- | -------- | ------------------------------ | ---------------- |
| `GCS_BUCKET`                     | Yes      | GCS bucket name                | -                |
| `GCS_PROJECT_ID`                 | No       | Google Cloud project ID        | From credentials |
| `GOOGLE_APPLICATION_CREDENTIALS` | No       | Path to service account key    | From environment |
| `GCS_BASE_PATH`                  | No       | Path prefix for uploads        | None             |
| `GCS_MAKE_PUBLIC`                | No       | Make files publicly accessible | `true`           |

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "file-upload": {
      "command": "npx",
      "args": ["-y", "file-upload-mcp-server"],
      "env": {
        "GCS_BUCKET": "your-bucket-name",
        "GCS_BASE_PATH": "screenshots/",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json"
      }
    }
  }
}
```

## Tools

### `upload_to_gcs`

Upload a file to Google Cloud Storage.

**Parameters:**

| Parameter     | Type   | Required | Description                               |
| ------------- | ------ | -------- | ----------------------------------------- |
| `source`      | string | Yes      | File path (`file://...`) or base64 data   |
| `filename`    | string | No       | Custom filename for the upload            |
| `contentType` | string | No       | MIME type (auto-detected if not provided) |

**Returns:**

```json
{
  "url": "https://storage.googleapis.com/bucket/path/file.png",
  "bucket": "bucket-name",
  "path": "path/file.png",
  "size": 12345,
  "contentType": "image/png"
}
```

**Example:**

```javascript
// Upload from file:// URI (e.g., from playwright-stealth screenshot)
upload_to_gcs({
  source: 'file:///tmp/playwright-screenshots/page.png',
  filename: 'pr-screenshot.png',
});

// Upload base64 data directly
upload_to_gcs({
  source: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ...',
  filename: 'image.png',
  contentType: 'image/png',
});
```

## Use Case: Screenshot Upload Workflow

This server is designed to work with the `playwright-stealth` MCP server for uploading screenshots to cloud storage:

1. Use `playwright-stealth` to navigate and take screenshots
2. Screenshots are saved as MCP resources with `file://` URIs
3. Use `file-upload` server to upload the screenshot to GCS
4. Get a public URL to share in PRs, documentation, etc.

```
playwright-stealth → browser_screenshot → file:///tmp/screenshot.png
file-upload → upload_to_gcs → https://storage.googleapis.com/.../screenshot.png
```

## Authentication

The server uses Google Cloud's default authentication chain:

1. `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. Application Default Credentials (ADC)
3. Service account attached to the compute instance

For local development, you can use:

```bash
gcloud auth application-default login
```

## License

MIT
