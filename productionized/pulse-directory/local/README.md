# Local Configuration

This section contains local-specific configuration for the Pulse Directory MCP server.

## Direct Execution

If you've cloned the repository, you can run the server directly:

```bash
cd local
npm install
npm run build
PULSEMCP_API_KEY=your-key node build/index.js
```

## Development Mode

For development with auto-reload:

```bash
cd local
npm run dev
```
