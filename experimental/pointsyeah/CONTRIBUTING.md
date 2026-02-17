# Contributing to PointsYeah MCP Server

## Development Setup

1. Clone the repository and navigate to the server directory:

   ```bash
   git clone https://github.com/pulsemcp/mcp-servers.git
   cd mcp-servers/experimental/pointsyeah
   ```

2. Install dependencies:

   ```bash
   npm run install-all
   ```

3. Build:
   ```bash
   npm run build
   ```

## Testing

### Functional Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Tests

```bash
# First-time setup
npm run test:manual:setup

# Run tests
npm run test:manual
```

## Code Quality

Always run linting from the repository root:

```bash
cd ../..
npm run lint
npm run format
```

## Architecture

See [CLAUDE.md](./CLAUDE.md) for implementation details and architecture notes.
