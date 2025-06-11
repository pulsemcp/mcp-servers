# Contributing

Before starting any work, please open an Issue to discuss the changes you'd like to make; let's make sure we don't duplicate effort.

Please do all your work on a fork of the repository and open a PR against the main branch.

## Running the server locally

```
npm run build
npm run start
```

## Generating types

AppSignal uses GraphQL for their API. To generate TypeScript types:

1. Access the GraphQL schema at: `https://appsignal.com/graphql?token=your-personal-api-token`
2. You can introspect the schema and download it using a GraphQL client or use the following approach:

```bash
# First, get the schema using graphql-codegen
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/introspection

# Create a codegen config file (codegen.yml):
# overwrite: true
# schema: 
#   - https://appsignal.com/graphql:
#       headers:
#         Authorization: "Bearer your-personal-api-token"
# generates:
#   src/appsignalApi/schema.graphql:
#     plugins:
#       - introspection
#   src/appsignalApi/types.ts:
#     plugins:
#       - typescript

# Run the codegen
npx graphql-codegen
```

## Debugging tools

### Running Inspector

```
npx @modelcontextprotocol/inspector node path/to/mcp-server-appsignal/build/index.js
```

### Claude

#### Follow logs in real-time

```
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## Testing with a test.ts file

Helpful for isolating and trying out pieces of code.

1. Create a `src/test.ts` file.
2. Write something like this in it

```ts
import * as dotenv from "dotenv";
import { AppSignalApiClient } from "./appsignal/appsignalApiClient.js";

dotenv.config();

if (!process.env.APPSIGNAL_API_KEY) {
	throw new Error("APPSIGNAL_API_KEY is required in .env file");
}

if (!process.env.APPSIGNAL_APP_ID) {
	throw new Error("APPSIGNAL_APP_ID is required in .env file");
}

const API_KEY = process.env.APPSIGNAL_API_KEY;
const APP_ID = process.env.APPSIGNAL_APP_ID;

async function test() {
	const client = new AppSignalApiClient(API_KEY, APP_ID);
	
	// Test getting alert details
	const alertDetails = await client.getAlertDetails("alert-id-123");
	console.log("Alert details:", alertDetails);
	
	// Test searching logs
	const logs = await client.searchLogs({
		query: "error",
		limit: 10
	});
	console.log("Search results:", logs);
	
	// Test getting logs in datetime range
	const rangedLogs = await client.getLogsInDatetimeRange({
		start: "2024-01-15T10:00:00Z",
		end: "2024-01-15T11:00:00Z"
	});
	console.log("Logs in range:", rangedLogs);
}

test().catch(console.error);
```

3. `npm run build` and `node build/test.js`

## Publishing

```
npm run build
```

Delete any files that shouldn't be published (e.g. `build/test.js`). Then run:

```
npm publish
```

After publishing, tag the GitHub repository with the version from package.json and add release notes:

```
# Get the version from package.json
VERSION=$(node -p "require('./package.json').version")

# Create an annotated tag with a message
git tag -a v$VERSION -m "Release v$VERSION"

# Push the tag to the remote repository
git push origin v$VERSION

# Create a GitHub release with more detailed notes
# You can do this through the GitHub UI:
# 1. Go to https://github.com/pulsemcp/mcp-servers/releases
# 2. Click "Draft a new release"
# 3. Select the tag you just pushed
# 4. Add a title (e.g., "v1.2.0")
# 5. Add detailed release notes describing the changes
# 6. Click "Publish release"
```

TODO: Automate these steps.