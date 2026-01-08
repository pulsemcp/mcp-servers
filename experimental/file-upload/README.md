# Remote Filesystem MCP Server

An MCP server for remote filesystem operations on cloud storage providers. Currently supports Google Cloud Storage (GCS), with plans for S3, Cloudflare R2, and more.

## Features

- **Upload** files to cloud storage with public/private access control
- **Download** files as text or base64 (for binary files)
- **List** files and directories with prefix filtering
- **Modify** file properties (public/private, content type, metadata)
- **Delete** files from remote storage
- Root path constraint to restrict access within bucket
- Toolset groups for permission-based access control
- Inline credentials support (no JSON key file needed)
- Signed URL generation for private files

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

| Variable                         | Required | Description                          | Default |
| -------------------------------- | -------- | ------------------------------------ | ------- |
| `GCS_BUCKET`                     | Yes      | GCS bucket name                      | -       |
| `GCS_PROJECT_ID`                 | No       | Google Cloud project ID              | Auto    |
| `GCS_CLIENT_EMAIL`               | No\*     | Service account email (inline creds) | -       |
| `GCS_PRIVATE_KEY`                | No\*     | Service account private key (inline) | -       |
| `GOOGLE_APPLICATION_CREDENTIALS` | No\*     | Path to service account key file     | -       |
| `GCS_ROOT_PATH`                  | No       | Root path prefix - restricts access  | None    |
| `GCS_MAKE_PUBLIC`                | No       | Make files publicly accessible       | `false` |
| `ENABLED_TOOLGROUPS`             | No       | Tool groups: `readonly`, `readwrite` | All     |

\* One authentication method required: inline credentials OR key file OR ADC

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "remote-filesystem": {
      "command": "npx",
      "args": ["-y", "file-upload-mcp-server"],
      "env": {
        "GCS_BUCKET": "your-bucket-name",
        "GCS_CLIENT_EMAIL": "sa@project.iam.gserviceaccount.com",
        "GCS_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\n...",
        "GCS_ROOT_PATH": "uploads/"
      }
    }
  }
}
```

## Tools

### `upload`

Upload a file to the remote filesystem.

**Parameters:**

| Parameter     | Type    | Required | Description                               |
| ------------- | ------- | -------- | ----------------------------------------- |
| `source`      | string  | Yes      | File path (`file://...`) or base64 data   |
| `path`        | string  | No       | Destination path (auto-generated if none) |
| `contentType` | string  | No       | MIME type (auto-detected if not provided) |
| `makePublic`  | boolean | No       | Override default public/private setting   |

**Example:**

```javascript
upload({
  source: 'file:///tmp/screenshot.png',
  path: 'screenshots/pr-123.png',
  makePublic: true,
});
```

### `download`

Download a file from the remote filesystem.

**Parameters:**

| Parameter  | Type    | Required | Description                        |
| ---------- | ------- | -------- | ---------------------------------- |
| `path`     | string  | Yes      | Path to the file                   |
| `asBase64` | boolean | No       | Return as base64 (for binary data) |

**Example:**

```javascript
download({
  path: 'screenshots/pr-123.png',
  asBase64: true,
});
```

### `list_files`

List files and directories in the remote filesystem.

**Parameters:**

| Parameter    | Type   | Required | Description              |
| ------------ | ------ | -------- | ------------------------ |
| `prefix`     | string | No       | Directory prefix to list |
| `maxResults` | number | No       | Maximum files to return  |

**Example:**

```javascript
list_files({
  prefix: 'screenshots/',
  maxResults: 100,
});
```

### `modify`

Modify file properties.

**Parameters:**

| Parameter     | Type    | Required | Description               |
| ------------- | ------- | -------- | ------------------------- |
| `path`        | string  | Yes      | Path to the file          |
| `makePublic`  | boolean | No       | Make file public          |
| `makePrivate` | boolean | No       | Make file private         |
| `contentType` | string  | No       | New MIME type             |
| `metadata`    | object  | No       | Custom metadata key-value |

**Example:**

```javascript
modify({
  path: 'reports/doc.pdf',
  makePublic: true,
  metadata: { author: 'claude' },
});
```

### `delete_file`

Delete a file from the remote filesystem.

**Parameters:**

| Parameter | Type   | Required | Description      |
| --------- | ------ | -------- | ---------------- |
| `path`    | string | Yes      | Path to the file |

**Example:**

```javascript
delete_file({
  path: 'temp/old-file.txt',
});
```

## Toolset Groups

The server supports permission-based access control via tool groups:

- **`readonly`**: Only `download` and `list_files` tools are available
- **`readwrite`**: All tools are available (includes readonly tools)

Set `ENABLED_TOOLGROUPS=readonly` to restrict to read-only operations.

## Authentication

The server supports multiple authentication methods:

### 1. Inline Credentials (Recommended)

```bash
GCS_CLIENT_EMAIL=sa@project.iam.gserviceaccount.com
GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Key File

```bash
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### 3. Application Default Credentials (ADC)

```bash
gcloud auth application-default login
```

## License

MIT
