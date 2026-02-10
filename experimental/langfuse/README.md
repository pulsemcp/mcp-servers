# Langfuse MCP Server

MCP server for readonly analysis of [Langfuse](https://langfuse.com) LLM traces and observations. Designed to help agents deeply inspect trace data, debug LLM pipelines, and analyze costs and latency.

## Highlights

- Browse and filter traces by name, user, session, tags, timestamps, and environment
- Drill into full trace details including all nested observations and scores
- List and filter observations by type (GENERATION, SPAN, EVENT), model, level, and more
- Automatic truncation of large payloads (>1000 chars) to /tmp files with grep-friendly references
- Read-only — no write operations, safe to use without risk of data modification

## Capabilities

### Tools

| Tool               | Description                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------- |
| `get_traces`       | List traces with filtering and pagination. Returns minimal summary (no I/O fields).            |
| `get_trace_detail` | Get full trace by ID including observations, scores, input/output, and metadata.               |
| `get_observations` | List observations with filtering by traceId, type, level, etc. Returns minimal summary.        |
| `get_observation`  | Get full observation by ID including input, output, model parameters, usage, and cost details. |

### Resources

| Resource            | Description                                     |
| ------------------- | ----------------------------------------------- |
| `langfuse://config` | Server configuration and status (for debugging) |

### Large Payload Handling

Trace and observation data often contains very large input/output fields (full prompts, completions, etc.). This server automatically:

1. Truncates any string field longer than 1000 characters
2. Saves the full content to a `/tmp/langfuse_*.txt` file
3. Includes the file path in the truncated output

Agents can then use `grep` to search within these files for specific content without loading the entire payload into context.

## Configuration

### Environment Variables

| Variable              | Required | Description                     | Default                      |
| --------------------- | -------- | ------------------------------- | ---------------------------- |
| `LANGFUSE_SECRET_KEY` | Yes      | Langfuse secret key (sk-lf-...) | -                            |
| `LANGFUSE_PUBLIC_KEY` | Yes      | Langfuse public key (pk-lf-...) | -                            |
| `LANGFUSE_BASE_URL`   | No       | Langfuse API base URL           | `https://cloud.langfuse.com` |

### Claude Desktop Configuration

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "langfuse": {
      "command": "npx",
      "args": ["-y", "langfuse-observability-mcp-server"],
      "env": {
        "LANGFUSE_SECRET_KEY": "sk-lf-your-secret-key",
        "LANGFUSE_PUBLIC_KEY": "pk-lf-your-public-key",
        "LANGFUSE_BASE_URL": "https://us.cloud.langfuse.com"
      }
    }
  }
}
```

## Development

```bash
# Install dependencies
npm run install-all

# Build
npm run build

# Development mode
npm run dev

# Run functional tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests (requires .env with real credentials)
npm run test:manual
```

## License

MIT
