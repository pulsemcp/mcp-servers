# Contributing

Before starting any work, please open an Issue to discuss the changes you'd like to make; let's make sure we don't duplicate effort.

Please do all your work on a fork of the repository and open a PR against the main branch.

## Running the server locally

```bash
npm install
npm run build
npm run start
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key environment variables:

- `TWIST_WORKSPACE`: The Twist workspace ID or URL (required)
- `TWIST_API_KEY`: Your Twist API key (required)

## Debugging tools

### Running Inspector

Using local build:

```bash
cd experimental/twist
npm install
npm run build
npx @modelcontextprotocol/inspector node local/dist/index.js \
  -e TWIST_WORKSPACE=<your-workspace-id-or-url> \
  -e TWIST_API_KEY=<your-api-key>
```

Using published package:

```bash
npx @modelcontextprotocol/inspector npx @pulsemcp/twist-mcp-server@latest \
  -e TWIST_WORKSPACE=<your-workspace-id-or-url> \
  -e TWIST_API_KEY=<your-api-key>
```

### Claude Desktop

#### Follow logs in real-time

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing

This project has three types of tests:

1. **Functional Tests** (`npm test`) - Unit tests with mocked dependencies
2. **Integration Tests** (`npm run test:integration`) - Tests the full MCP server
3. **Manual Tests** (`npm run test:manual`) - Tests against the real Twist API

### Manual Testing

Manual tests are critical when modifying the Twist client or any code that interacts with the Twist API. They:

- Use real Twist API credentials (not mocked)
- Verify the actual API integration works correctly
- Test response shapes and error handling with real data
- Are NOT run in CI to avoid external dependencies

**When to run manual tests:**

- After modifying any code in `shared/src/twist-client/`
- When updating API endpoints or request formats
- Before releasing changes that affect external API calls
- When debugging issues that only appear with real API responses

**Running manual tests:**

```bash
# Copy .env.example to .env and add your API credentials
cp .env.example .env
# Edit .env to add your real Twist workspace and API key

# Run manual tests
npm run test:manual
```

## Testing with a test.ts file

Helpful for isolating and trying out pieces of code.

1. Create a `src/test.ts` file.
2. Write test code to exercise specific functionality
3. Run with: `npm run build && node build/test.js`

Example test file:

```ts
import * as dotenv from 'dotenv';
import { TwistClient } from './twist-client/index.js';

dotenv.config();

if (!process.env.TWIST_WORKSPACE || !process.env.TWIST_API_KEY) {
  throw new Error('TWIST_WORKSPACE and TWIST_API_KEY are required in .env file');
}

async function test() {
  const client = new TwistClient(process.env.TWIST_WORKSPACE, process.env.TWIST_API_KEY);

  // Test getting channels
  const channels = await client.getChannels();
  console.log('Channels:', channels);

  // Test getting threads in first channel
  if (channels.length > 0) {
    const threads = await client.getThreads({ channelId: channels[0].id });
    console.log('Threads in first channel:', threads);
  }

  // Test posting a message
  const result = await client.postMessage({
    channelId: channels[0].id,
    threadId: 'new',
    content: 'Test message from MCP server',
  });
  console.log('Posted message:', result);
}

test().catch(console.error);
```

## Publishing

See the main repository's [PUBLISHING_SERVERS.md](../../docs/PUBLISHING_SERVERS.md) for detailed publishing instructions.

Quick summary:

1. Update version: `npm run stage-publish`
2. Update CHANGELOG.md
3. Commit all changes
4. Push and create PR
5. After merge, GitHub Actions will publish automatically

## Development Tips

- Always run linting from the repository root: `npm run lint`
- The server uses REST API v3 for Twist integration
- All timestamps from Twist API are in RFC3339 format
- Thread IDs can be either numeric IDs or "new" for creating new threads
- Workspace can be specified as either an ID or URL (will be parsed to extract ID)
