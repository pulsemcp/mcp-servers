# Contributing to PulseMCP CMS Admin MCP Server

## Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env to add your PULSEMCP_ADMIN_API_KEY
   ```

3. Build and run:
   ```bash
   npm run build
   npm run dev  # Development mode with auto-reload
   ```

## Environment Variables

Required:

- `PULSEMCP_ADMIN_API_KEY` - API key for authentication with PulseMCP Admin API

## Debugging

### Using MCP Inspector

```bash
cd experimental/pulsemcp-cms-admin
npm install && npm run build
npx @modelcontextprotocol/inspector node local/build/index.js \
  -e PULSEMCP_ADMIN_API_KEY=<your-api-key>
```

### Claude Desktop Logs

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing

### Run All Tests

```bash
npm test              # Functional tests (watch mode)
npm run test:run      # Functional tests (single run)
npm run test:integration  # Integration tests
npm run test:manual   # Manual tests (requires API key)
npm run test:all      # Run all tests
```

### Manual Testing

Manual tests hit the real PulseMCP Admin API and require a valid API key:

1. Ensure `.env` file contains `PULSEMCP_ADMIN_API_KEY`
2. Run: `npm run test:manual`

These tests verify:

- Newsletter post CRUD operations
- Image upload functionality
- Author listing
- Error handling

## Development Guidelines

### Code Style

- Run linting from repository root: `npm run lint`
- Format code: `npm run format`
- TypeScript strict mode is enabled
- Use Zod for input validation

### Adding New Tools

1. Create tool file in `shared/src/tools/`
2. Follow the existing pattern with comprehensive descriptions
3. Add to the tools array in `shared/src/tools.ts`
4. Add tests in `tests/functional/`

### API Client Development

- Client code is in `shared/src/pulsemcp-admin-client/`
- Each API method has its own file in `lib/`
- Use Rails-style form encoding for POST/PUT requests
- Handle errors appropriately (401, 403, 422, etc.)

## Publishing

See [PUBLISHING_SERVERS.md](../../docs/PUBLISHING_SERVERS.md) for detailed instructions.

## Troubleshooting

### Common Issues

1. **Module not found errors**: Run `rm -rf node_modules && npm install` from repo root
2. **Linting failures**: Run `npm run lint:fix` from repo root
3. **API 401 errors**: Check your API key is valid
4. **API 403 errors**: Ensure your user has admin privileges
