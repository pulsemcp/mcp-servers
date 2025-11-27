# Contributing to Hatchbox MCP Server

Thank you for your interest in contributing to the Hatchbox MCP Server! This guide will help you get started with development and testing.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your Hatchbox credentials
4. Build the project: `npm run build`
5. Run tests: `npm test`

## Running the server locally

```bash
npm install
npm run build
npm run dev  # Development mode with auto-reload
# or
npm start    # Production mode
```

## Environment Variables

Create a `.env` file with your Hatchbox credentials:

```bash
# Required
HATCHBOX_API_KEY=your-api-key
HATCHBOX_ACCOUNT_ID=your-account-id
HATCHBOX_APP_ID=your-app-id
HATCHBOX_DEPLOY_KEY=your-deploy-key

# Optional - for SSH functionality
WEB_SERVER_IP_ADDRESS=your.server.ip
SSH_KEY_PATH=/path/to/ssh/key
HATCHBOX_APP_NAME=your-app-name

# Optional - security settings
READONLY=false      # Enable write operations
ALLOW_DEPLOYS=true  # Enable deployment operations
```

## Debugging tools

### Running Inspector

Using local build:

```bash
cd experimental/hatchbox
npm install
npm run build
npx @modelcontextprotocol/inspector node local/build/index.js \
  -e HATCHBOX_API_KEY=your-key \
  -e HATCHBOX_ACCOUNT_ID=your-account \
  -e HATCHBOX_APP_ID=your-app \
  -e HATCHBOX_DEPLOY_KEY=your-deploy-key
```

Using published package (after publishing):

```bash
npx @modelcontextprotocol/inspector npx hatchbox-mcp-server@latest \
  -e HATCHBOX_API_KEY=your-key \
  -e HATCHBOX_ACCOUNT_ID=your-account \
  -e HATCHBOX_APP_ID=your-app \
  -e HATCHBOX_DEPLOY_KEY=your-deploy-key
```

### Claude Desktop

#### Follow logs in real-time

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing

The Hatchbox MCP Server includes three types of tests:

1. **Functional Tests** (`npm test`) - Unit tests with mocked Hatchbox API
2. **Integration Tests** (`npm run test:integration`) - Tests the full MCP protocol
3. **Manual Tests** (`npm run test:manual`) - Tests against real Hatchbox API

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run functional tests once
npm run test:functional

# Run integration tests
npm run test:integration

# Run manual tests (requires real API credentials)
npm run test:manual
```

### Manual Testing

Manual tests are crucial for verifying real API integration:

1. Ensure your `.env` file has valid Hatchbox credentials
2. Run `npm run test:manual`
3. Update `MANUAL_TESTING.md` with results
4. Include the commit hash and test results

### Writing Tests

- **Functional tests**: Mock the HatchboxClient methods
- **Integration tests**: Use TestMCPClient with mocked API responses
- **Manual tests**: Test real API calls, handle rate limits gracefully

## Architecture

### Key Components

- **HatchboxClient** (`shared/src/server.ts`): Main API client
- **Tools** (`shared/src/tools/`): Individual MCP tool implementations
- **SSH Integration** (`shared/src/hatchbox-client/lib/get-env-vars-ssh.ts`): SSH-based env var reading

### Security Features

- **READONLY mode**: Prevents write operations by default
- **ALLOW_DEPLOYS**: Controls deployment access
- **Conditional tool surfacing**: Tools only appear when properly configured

## Development Tips

- Always run linting from repository root: `npm run lint`
- Follow existing patterns for new tools
- Use Zod for input validation
- Include comprehensive error handling
- Update tests when modifying functionality
- Document changes in CHANGELOG.md

## Adding New Features

1. **New Tools**:
   - Create in `shared/src/tools/`
   - Follow existing tool patterns
   - Add to `shared/src/tools.ts`
   - Include tests

2. **API Methods**:
   - Add to HatchboxClient class
   - Create lib file if complex
   - Mock in test files

3. **Configuration Options**:
   - Add to `.env.example`
   - Document in README.md
   - Handle in server initialization

## Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Add changes to CHANGELOG.md under "Unreleased"
4. Run manual tests if API changes involved
5. Submit PR with clear description

## Publishing

See the main repository's [PUBLISHING_SERVERS.md](../../docs/PUBLISHING_SERVERS.md) for detailed publishing instructions.

Quick summary:

1. From `local/` directory: `npm run stage-publish patch/minor/major`
2. Update CHANGELOG.md with version and date
3. Commit all changes
4. Push and create PR
5. After merge, GitHub Actions publishes automatically

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**: Check SSH key permissions and server IP
2. **API Authentication Error**: Verify API key and account/app IDs
3. **Tool Not Available**: Check environment variables and permissions
4. **Build Errors**: Run `npm install` from repository root

### Getting Help

- Check existing issues in the repository
- Review test files for usage examples
- Consult the Hatchbox API documentation
