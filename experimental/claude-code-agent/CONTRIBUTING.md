# Contributing

This document provides guidelines for contributing to the claude-code-agent MCP server.

## Getting Started

1. Copy this entire directory to your desired location
2. Rename the directory to your server name
3. Update all instances of:
   - `NAME` → claude-code-agent
   - `DESCRIPTION` → Claude Code Agent MCP Server - enables agentic MCP configuration
   - Package names in `package.json` files
4. Update this CONTRIBUTING.md with your server-specific information

## Running the server locally

```bash
npm install
npm run build
npm run start
```

## Environment Variables

Create a `.env` file for any required configuration:

```bash
# Example environment variables
# CLAUDE_CODE_PATH=/path/to/claude
# TRUSTED_SERVERS_PATH=/path/to/servers.md
# SERVER_CONFIGS_PATH=/path/to/servers.json
# CLAUDE_AGENT_BASE_DIR=/path/to/agents
# CLAUDE_AGENT_LOG_LEVEL=info
```

## Debugging tools

### Running Inspector

Using local build:

```bash
cd your-server-directory
npm install
npm run build
npx @modelcontextprotocol/inspector node local/build/index.js \
  -e YOUR_ENV_VAR=<your-value> \
  -e ANOTHER_ENV_VAR=<another-value>
```

Using published package (after publishing):

```bash
npx @modelcontextprotocol/inspector npx @your-org/your-server@latest \
  -e YOUR_ENV_VAR=<your-value> \
  -e ANOTHER_ENV_VAR=<another-value>
```

### Claude Desktop

#### Follow logs in real-time

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing

This template includes placeholders for three types of tests:

1. **Functional Tests** (`npm test`) - Unit tests with mocked dependencies
2. **Integration Tests** (`npm run test:integration`) - Tests the full MCP server
3. **Manual Tests** (`npm run test:manual`) - Tests against real external APIs

### Setting Up Tests

1. Create test files in the appropriate directories:
   - `tests/functional/` - For unit tests
   - `tests/integration/` - For integration tests
   - `tests/manual/` - For manual tests

2. Follow the patterns from other MCP servers in this repository

### Manual Testing

Manual tests are important when your server interacts with external APIs:

- Use real API credentials (not mocked)
- Verify actual API integration works correctly
- Test response shapes and error handling
- Are NOT run in CI to avoid external dependencies

## Testing with a test.ts file

Helpful for isolating and trying out pieces of code.

1. Create a `src/test.ts` file
2. Write test code to exercise specific functionality
3. Run with: `npm run build && node build/test.js`

Example test file:

```ts
import * as dotenv from 'dotenv';
// Import your server components here

dotenv.config();

async function test() {
  // Add your test code here
  console.log('Testing server functionality...');
}

test().catch(console.error);
```

## Publishing

See the main repository's [PUBLISHING_SERVERS.md](../docs/PUBLISHING_SERVERS.md) for detailed publishing instructions.

Quick summary:

1. Update version: `npm run stage-publish`
2. Update CHANGELOG.md
3. Commit all changes
4. Push and create PR
5. After merge, GitHub Actions will publish automatically

## Development Tips

- Always run linting from the repository root: `npm run lint`
- Follow the MCP SDK patterns for implementing resources and tools
- Use Zod for input validation
- Include comprehensive error handling
- Document all resources and tools in your README.md
- Consider adding TypeScript JSDoc comments for better IDE support

## Template Structure

This template follows the standard MCP server structure:

```
your-server/
├── shared/           # Core business logic
│   ├── src/
│   │   ├── resources.ts  # MCP resources
│   │   ├── tools.ts      # MCP tools
│   │   └── index.ts      # Main exports
│   └── package.json
├── local/            # Stdio transport
│   ├── src/
│   │   └── index.ts      # Server setup
│   └── package.json
├── tests/            # Test suites
├── package.json      # Root workspace
├── README.md         # User documentation
├── CHANGELOG.md      # Version history
├── CONTRIBUTING.md   # This file
└── .env.example      # Environment template
```
