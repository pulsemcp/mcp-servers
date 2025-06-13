# Test MCP Client

A test client for driving integration tests against MCP (Model Context Protocol) servers. This client provides a programmatic interface for testing MCP server implementations across different transport mechanisms.

## Purpose

This package is designed to facilitate integration testing of MCP servers by providing:

- A consistent API for interacting with MCP servers programmatically
- Transport abstraction to support testing across different connection methods
- Type-safe interfaces for MCP operations
- Easy setup for test scenarios with mocked dependencies

## Features

- **Transport Support**: Currently implements stdio transport, with architecture designed for future transport extensions
- **Full MCP Protocol Coverage**: List tools/resources, call tools, read resources
- **Type Safety**: Full TypeScript support with proper types for all operations
- **Test-Friendly**: Designed specifically for integration testing scenarios
- **Debug Mode**: Built-in debugging capabilities for troubleshooting test failures
- **Environment Injection**: Pass environment variables to server processes

## Installation

```bash
npm install
npm run build
```

## Transport Support

### Currently Implemented

- **stdio**: Spawn MCP servers as child processes and communicate via standard input/output

### Future Transports (Architecture Ready)

- **HTTP/SSE**: For testing servers that expose HTTP endpoints
- **WebSocket**: For real-time bidirectional communication testing
- **In-Process**: For testing server logic directly without process boundaries

## Usage

### Basic Example

```typescript
import { TestMCPClient } from 'test-mcp-client';

// Create a test client (stdio transport)
const client = new TestMCPClient({
  serverPath: '/path/to/mcp-server/build/index.js',
  serverArgs: [],
  env: {
    API_KEY: 'test-key',
  },
  debug: true,
});

// Connect to the server
await client.connect();

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools);

// Call a tool
const result = await client.callTool('search_logs', {
  query: 'error',
  limit: 10,
});
console.log('Tool result:', result);

// Disconnect when done
await client.disconnect();
```

### Integration Test Example

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from 'test-mcp-client';

describe('MCP Server Integration Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    client = new TestMCPClient({
      serverPath: './dist/server.js',
      env: { NODE_ENV: 'test' },
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  it('should execute tool successfully', async () => {
    const result = await client.callTool('my_tool', { param: 'value' });
    expect(result.isError).toBe(false);
    expect(result.content).toBeDefined();
  });
});
```

## API Reference

### `TestMCPClient`

The main client class for interacting with MCP servers.

#### Constructor Options

```typescript
interface TestMCPClientOptions {
  // Stdio transport specific options
  serverPath: string; // Path to the MCP server executable
  serverArgs?: string[]; // Optional arguments to pass to the server
  env?: Record<string, string>; // Environment variables for the server process

  // General options
  debug?: boolean; // Enable debug logging

  // Future: transport?: 'stdio' | 'http' | 'websocket'
}
```

#### Methods

##### Connection Management

- `connect(): Promise<void>` - Establish connection to the MCP server
- `disconnect(): Promise<void>` - Gracefully disconnect from the server

##### MCP Operations

- `listTools(): Promise<ListToolsResult>` - List all available tools
- `callTool<T>(name: string, args?: Record<string, any>): Promise<ToolCallResult<T>>` - Execute a tool
- `listResources(): Promise<ListResourcesResult>` - List all available resources
- `readResource<T>(uri: string): Promise<ResourceReadResult<T>>` - Read a resource by URI

#### Return Types

```typescript
interface ToolCallResult<T = any> {
  content: T[];
  isError?: boolean;
}

interface ResourceReadResult<T = any> {
  contents: T[];
}
```

## Architecture

The TestMCPClient is designed with transport abstraction in mind:

```
TestMCPClient
    ├── Transport Layer (stdio, future: http, ws)
    ├── MCP Protocol Layer
    └── Type-safe API Layer
```

This design allows for:

- Easy addition of new transport mechanisms
- Consistent API regardless of transport
- Proper separation of concerns
- Testability at each layer

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

## Extending Transport Support

To add a new transport in the future:

1. Create a new transport adapter implementing the transport interface
2. Update `TestMCPClientOptions` to include transport selection
3. Modify the client to use the appropriate transport based on options

Example structure for future transports:

```typescript
// Future transport interface
interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendRequest(method: string, params: any): Promise<any>;
}

// Future usage
const client = new TestMCPClient({
  transport: 'http',
  serverUrl: 'http://localhost:3000/mcp',
  debug: true,
});
```

## Limitations & Future Work

### Current Limitations

- **Single Server**: Can only connect to one MCP server at a time (no support for multiple concurrent connections)
- **Node.js Only**: Server must be a Node.js executable (uses `node` command to spawn process)
- **Stdio Transport Only**: Currently only supports stdio transport for server communication

## Contributing

When contributing to this package:

- Maintain transport abstraction in the design
- Ensure all changes are backward compatible
- Add tests for new functionality
- Update documentation as needed

## License

MIT
