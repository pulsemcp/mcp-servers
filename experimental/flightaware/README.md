# FlightAware MCP Server

An MCP server for FlightAware [AeroAPI](https://www.flightaware.com/aeroapi/portal/) — FlightAware's official flight-data REST API. Look up live and scheduled flight status, trace a flight's flown path, and read airport arrival/departure boards and delay summaries.

## Tools

| Tool                      | Description                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `search_flights_by_ident` | Look up flights and their live/scheduled status by flight number, tail number (registration), or `fa_flight_id` |
| `get_flight_track`        | Get the recorded position track (the flown path) for a single flight, identified by its `fa_flight_id`          |
| `get_airport_info`        | Get general information about an airport (name, codes, location, timezone, elevation)                           |
| `get_airport_flights`     | Get an airport's flight board — arrivals, departures, and scheduled flights                                     |
| `get_airport_delays`      | Get an airport's current delay category, total delay, and a breakdown of delay reasons                          |

## Read-only — watch for changes by polling

Every tool is a read. AeroAPI's own alert feature delivers notifications **only** as HTTP POST webhooks to a server you host (there is no native SMS, email, or push delivery), so this server does not expose alert tools. To watch a flight or airport for a change — a departure, a diversion, a new delay — have the agent call the relevant read tool on an interval and diff the results.

(For personal SMS/push alerts unrelated to this server, FlightAware's consumer website at flightaware.com offers flight alerts directly through a FlightAware account — a separate product from AeroAPI.)

## Quick Start

### Claude Desktop

Add this to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "flightaware": {
      "command": "npx",
      "args": ["-y", "flightaware-mcp-server"],
      "env": {
        "AEROAPI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Manual Setup

```bash
# From the server directory
cd experimental/flightaware

# Set your AeroAPI key
export AEROAPI_API_KEY=your_api_key_here

# Build and run
npm run build
cd local && npm start
```

## Configuration

| Variable          | Required | Description                                                                                                              |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `AEROAPI_API_KEY` | Yes      | Your FlightAware AeroAPI key ([get one here](https://www.flightaware.com/aeroapi/portal/)). AeroAPI is billed per query. |

## Example Usage

### Check a flight's status

```
What's the status of United flight UA123?
```

`search_flights_by_ident` is called with `ident: "UAL123"` and returns each dated operation for that flight number, including origin/destination, gates, scheduled vs. estimated times, delays, and progress.

### Trace a flight's path

After finding a flight, pass its `fa_flight_id` to `get_flight_track` to get the recorded positions (lat/long, altitude, groundspeed, heading) along the flown route.

### Airport delays and boards

```
Are there delays at SFO right now? What's departing?
```

`get_airport_delays` returns KSFO's delay category and reasons; `get_airport_flights` returns the arrivals/departures board.

### Watch a flight for changes

```
Keep an eye on UA123 and tell me when it departs
```

Since the server is read-only, the agent polls `search_flights_by_ident` (with `ident: "UAL123"`) on an interval and compares `actual_off` / `status` across calls to detect the change. AeroAPI is billed per query, so poll no more often than you need.

## Development

```bash
npm run build             # Build shared + local
npm test                  # Run functional tests (mocked client)
npm run test:integration  # Run integration tests (full MCP protocol, mocked AeroAPI)
npm run test:manual       # Run manual tests against the real AeroAPI (requires AEROAPI_API_KEY)
```

## Project Structure

```
flightaware/
├── local/              # Stdio transport entry point
│   └── src/
│       ├── index.ts                       # Main entry point
│       └── index.integration-with-mock.ts # Mock entry for integration tests
├── shared/             # Core business logic
│   └── src/
│       ├── server.ts         # MCP server factory + IAeroApiClient
│       ├── tools.ts          # Tool registration
│       ├── resources.ts      # Resource handlers (flightaware://config)
│       ├── types.ts          # TypeScript types
│       ├── logging.ts        # Logging utilities
│       ├── tools/            # Individual tool implementations
│       │   ├── search-flights-by-ident.ts
│       │   ├── get-flight-track.ts
│       │   ├── get-airport-info.ts
│       │   ├── get-airport-flights.ts
│       │   └── get-airport-delays.ts
│       └── aeroapi-client/   # AeroAPI HTTP client
│           ├── aeroapi-client.integration-mock.ts
│           ├── request.ts
│           └── lib/
│               ├── search-flights-by-ident.ts
│               ├── get-flight-track.ts
│               ├── get-airport-info.ts
│               ├── get-airport-flights.ts
│               └── get-airport-delays.ts
└── tests/
    ├── functional/       # Unit tests with a mocked AeroAPI client
    ├── integration/      # Full MCP protocol tests (mocked AeroAPI)
    ├── manual/           # Real AeroAPI tests (requires a key)
    └── mocks/            # Mock implementations
```
