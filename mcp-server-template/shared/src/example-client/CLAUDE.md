# Example Client

This directory contains the client implementation for interacting with external APIs.

## Structure

```
example-client/
├── CLAUDE.md              # This file
├── example-client.ts      # Interface exports
├── example-client.integration-mock.ts  # Integration test mock
└── lib/                   # Individual API method implementations
    ├── get-item.ts       # Example GET method
    └── search-items.ts   # Example search method
```

## Pattern Overview

### Interface-First Design

The client is defined as an interface (`IExampleClient`) in `server.ts`, enabling:
- Easy mocking for tests
- Clear contract for implementations
- Dependency injection via factory pattern

### Modular API Methods

Each API method is implemented in its own file under `lib/`:
- Better organization for complex clients
- Easier to test individual methods
- Clear separation of concerns
- Dynamic imports for better code splitting

### Client Implementation

The concrete client class:
1. Implements the interface
2. Stores credentials/configuration
3. Delegates to lib/ methods via dynamic imports

## Adding New Methods

1. Create a new file in `lib/` (e.g., `lib/create-item.ts`)
2. Export a function that takes credentials + parameters
3. Add the method signature to `IExampleClient` interface
4. Implement the method in `ExampleClient` class

## Testing

- Functional tests: Mock the entire client interface
- Integration tests: Use `example-client.integration-mock.ts`
- Manual tests: Use real client with actual credentials

## Best Practices

1. One file per API endpoint/method
2. Consistent error handling
3. TypeScript types for all parameters and returns
4. JSDoc comments for all public methods
5. Handle rate limiting and retries in lib/ methods