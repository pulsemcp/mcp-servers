# Google Flights MCP Server

MCP server for searching Google Flights. Provides flight search, date-price grids for finding cheapest travel dates, and airport IATA code lookup. No API key required.

## Highlights

- Flight search with full filtering (cabin class, stops, sorting, pagination)
- Date-price grid for finding cheapest travel dates across ~60 days
- Airport IATA code lookup by city name, airport name, or partial code
- No API key or authentication required
- Multi-passenger support (adults, children, infants)
- Multiple currency support
- Built-in rate limiting to avoid throttling
- TypeScript with strict type checking

## Capabilities

### Tools

| Tool                | Description                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| `search_flights`    | Search for flights with full filtering, sorting, and pagination        |
| `get_date_grid`     | Get a date-price grid showing the cheapest flight price for each day   |
| `find_airport_code` | Look up airport IATA codes by city name, airport name, or partial code |

### Resources

| Resource                  | Description                              |
| ------------------------- | ---------------------------------------- |
| `google-flights://config` | Server configuration and available tools |

## Quick Start

### Claude Desktop Configuration

If this is your first time using MCP Servers, make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-flights": {
      "command": "npx",
      "args": ["-y", "google-flights-mcp-server"]
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

### Example Usage

Search for flights:

```
"Find me the cheapest nonstop flights from SFO to LAX next Friday"
```

Find cheapest dates:

```
"When is the cheapest time to fly from JFK to London in March?"
```

Look up airport codes:

```
"What are the airport codes for Tokyo?"
```

## Development

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Running in Development Mode

```bash
npm run dev
```

### Testing

```bash
# Run manual tests (hits real Google Flights)
npm run test:manual
```

## Project Structure

```
google-flights/
├── local/                 # Local server implementation
│   ├── src/
│   │   └── index.ts      # Main entry point
│   └── package.json
├── shared/               # Shared business logic
│   ├── src/
│   │   ├── server.ts     # Server factory with DI
│   │   ├── tools.ts      # Tool registration
│   │   ├── tools/        # Individual tool implementations
│   │   ├── resources.ts  # Resource implementations
│   │   ├── flights-client/ # Google Flights client (protobuf + HTTP)
│   │   └── logging.ts
│   └── package.json
├── tests/                # Test suite
│   └── manual/           # Manual tests against real Google Flights
└── package.json          # Root workspace config
```

## License

MIT
