# Example External API Client

This directory contains the client implementation for interacting with external APIs (NOT MCP clients).

**Important**: This is an external API client for services like REST APIs, GraphQL endpoints, databases, etc. It is NOT related to MCP clients or the MCP protocol.

## Structure

```
example-client/
├── CLAUDE.md                         # This file
├── example-client.ts                 # Interface exports
├── example-client.integration-mock.ts # Integration test mock
└── lib/                              # Individual API method implementations
    ├── get-item.ts                   # Example GET method
    └── search-items.ts               # Example search method
```

## Pattern Overview

### Interface-First Design

The client is defined as an interface (`IExampleClient`) in `server.ts`, enabling:

- Easy mocking for tests
- Clear contract for implementations
- Dependency injection via factory pattern

### Modular API Methods (lib/ Subdirectory Pattern)

Each API method is implemented in its own file under `lib/`:

```typescript
// lib/get-item.ts
export async function getItem(
  apiKey: string,
  itemId: string
): Promise<Item> {
  const response = await fetch(`https://api.example.com/items/${itemId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get item: ${response.statusText}`);
  }

  return response.json();
}
```

**Benefits:**

- **Better organization** - One file per API endpoint
- **Easier testing** - Test individual methods in isolation
- **Clear separation** - Each method is self-contained
- **Lazy loading** - Dynamic imports for better code splitting
- **Simpler maintenance** - Changes isolated to single files

### Client Implementation Pattern

The concrete client class:

1. Implements the interface
2. Stores credentials/configuration
3. Delegates to lib/ methods via dynamic imports

```typescript
export class ExampleClient implements IExampleClient {
  constructor(private apiKey: string) {}

  async getItem(itemId: string): Promise<Item> {
    // Dynamic import for lazy loading
    const { getItem } = await import('./example-client/lib/get-item.js');
    return getItem(this.apiKey, itemId);
  }
}
```

## Adding New Methods

1. **Create a new file in `lib/`** (e.g., `lib/create-item.ts`)

   ```typescript
   export async function createItem(
     apiKey: string,
     data: CreateItemInput
   ): Promise<Item> {
     const response = await fetch('https://api.example.com/items', {
       method: 'POST',
       headers: {
         Authorization: `Bearer ${apiKey}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(data),
     });

     if (!response.ok) {
       throw new Error(`Failed to create item: ${response.statusText}`);
     }

     return response.json();
   }
   ```

2. **Add the method signature to `IExampleClient` interface** (in `server.ts`)

   ```typescript
   export interface IExampleClient {
     getItem(itemId: string): Promise<Item>;
     createItem(data: CreateItemInput): Promise<Item>;  // Add this
   }
   ```

3. **Implement the method in `ExampleClient` class** (in `server.ts`)

   ```typescript
   async createItem(data: CreateItemInput): Promise<Item> {
     const { createItem } = await import('./example-client/lib/create-item.js');
     return createItem(this.apiKey, data);
   }
   ```

## Testing

### Functional Tests
Mock the entire client interface using vitest:

```typescript
// tests/mocks/example-client.functional-mock.ts
import { vi } from 'vitest';
import type { IExampleClient } from '../../shared/src/server.js';

export function createFunctionalMockExampleClient(): IExampleClient {
  return {
    getItem: vi.fn(),
    searchItems: vi.fn(),
    createItem: vi.fn(),
  };
}
```

### Integration Tests
Use `example-client.integration-mock.ts` for TestMCPClient tests:

```typescript
// example-client.integration-mock.ts
export function createIntegrationMockExampleClient(
  mockData: MockData
): IExampleClient {
  return {
    getItem: async (itemId: string) => {
      return mockData.items[itemId] || { id: itemId, name: 'Mock Item', value: 'mock' };
    },
    // ... other methods
  };
}
```

### Manual Tests
Use real client with actual credentials from `.env`:

```typescript
const client = new ExampleClient(process.env.YOUR_API_KEY!);
const result = await client.getItem('real-item-id');
```

## Best Practices

1. **One file per API endpoint/method** - Keeps code organized and easy to find
2. **Consistent error handling** - Always check response.ok and throw descriptive errors
3. **TypeScript types** - Define types for all parameters and return values
4. **JSDoc comments** - Document all public methods with @param and @returns
5. **Handle rate limiting** - Implement retry logic in lib/ methods if needed
6. **Credential security** - Never log or expose API keys

## Known API Limitations

Document any API quirks or limitations here. Examples:

- API returns 500 error when `attributes` field is requested (workaround: exclude field)
- Pagination limited to 100 items per request
- Rate limit: 100 requests per minute

## Pre-Merge Checklist

Before merging changes to the client:

- [ ] All new methods have TypeScript types
- [ ] Error messages are user-friendly
- [ ] Manual tests pass with real credentials
- [ ] Integration mock updated for new methods
- [ ] CHANGELOG.md updated with changes
