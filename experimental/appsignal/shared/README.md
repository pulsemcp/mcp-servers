# AppSignal MCP Server - Shared Module

This module contains the shared business logic for both local and remote implementations of the AppSignal MCP server.

## Features

### Tools

- `get_alert_details`: Get detailed information about a specific alert
- `search_logs`: Search through application logs with flexible query parameters
- `get_logs_in_datetime_range`: Retrieve logs within a specific datetime range

### Resources

- `appsignal://config`: Current AppSignal configuration settings

## Building

```bash
npm run build
```

This compiles the TypeScript source to JavaScript with type declarations.
