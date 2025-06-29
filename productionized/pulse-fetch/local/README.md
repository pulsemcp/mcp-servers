# Pulse Fetch MCP Server - Local Implementation

This is the local implementation of the Pulse Fetch MCP server, designed to run on stdio transport.

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

- `FIRECRAWL_API_KEY`: Your Firecrawl API key (optional, for enhanced scraping)
- `BRIGHTDATA_BEARER_TOKEN`: Your BrightData bearer token (optional, for anti-bot bypass)
