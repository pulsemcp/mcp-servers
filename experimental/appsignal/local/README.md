# AppSignal MCP Server - Local Implementation

This is the local implementation of the AppSignal MCP server, designed to run on stdio transport.

## Installation

```bash
npm install
```

## Development

```bash
# Build shared module and run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Configuration

Set the following environment variables:

- `APPSIGNAL_API_KEY`: Your AppSignal API key (required)
- `APPSIGNAL_APP_ID`: Your AppSignal application ID (optional)