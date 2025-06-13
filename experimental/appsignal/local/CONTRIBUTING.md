# Contributing to AppSignal MCP Server

## Running with MCP Inspector

### Prerequisites

1. Build the AppSignal server:
```bash
cd experimental/appsignal/local
npm install
npm run build
```

### Running the Server with Inspector

From the `experimental/appsignal/local` directory, run:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Environment Variables

#### Using .env file (Recommended)

Create a `.env` file in the `experimental/appsignal/local` directory:

```bash
# .env
APPSIGNAL_APP_ID=your-app-id
APPSIGNAL_API_KEY=your-api-key
```

This file is gitignored and will persist your credentials across sessions.

#### Using export commands

Alternatively, you can set environment variables in your shell:

```bash
export APPSIGNAL_APP_ID="your-app-id"
export APPSIGNAL_API_KEY="your-api-key"
```

The server will use these as defaults when tools are called without explicit credentials.