# Pulse Fetch (Local)

See parent level [README.md](../README.md) for information on how this server is designed.

## Quickstart

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run the server:
   ```bash
   npm start
   ```

   For development mode:
   ```bash
   npm run dev
   ```

## Available Features

### Resources
- `hello://{name}` - Returns a greeting with the provided name

### Tools
- `fetch` - Simulated fetch tool that takes a URL and returns mock content

## Connecting to the server

### Using stdio transport
By default, the server starts in stdio mode, which is ideal for direct integration with LLM tooling.

The server follows the Model Context Protocol (MCP) stdio transport specification, making it compatible with any MCP client.

## Local-specific features

- Simplified Hello World implementation
- Clean, minimalist design
- Easily extensible for actual fetch implementation