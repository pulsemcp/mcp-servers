# Cloud Storage MCP Server - Local Implementation

This is the local implementation of the Cloud Storage MCP server using stdio transport.

## Usage

```bash
npm install
npm run build
npm start
```

## Development

```bash
npm run dev
```

This will automatically rebuild the shared module and start the server with auto-reload.

## Configuration

### Required Environment Variables

| Variable     | Description                      |
| ------------ | -------------------------------- |
| `GCS_BUCKET` | Google Cloud Storage bucket name |

### Optional Environment Variables

| Variable             | Description                         | Default            |
| -------------------- | ----------------------------------- | ------------------ |
| `GCS_ROOT_DIRECTORY` | Root directory prefix in the bucket | Bucket root        |
| `GCS_PROJECT_ID`     | Google Cloud project ID             | From default creds |
| `GCS_KEY_FILE`       | Path to service account JSON key    | Default creds      |
| `ENABLED_TOOLGROUPS` | Comma-separated tool groups         | All enabled        |
| `SKIP_HEALTH_CHECKS` | Skip bucket connectivity check      | `false`            |
