# Google Flights MCP Server

## Overview

MCP server that provides flight search, date-price grids, and airport code lookup via Google Flights. No API key required — uses protobuf-encoded HTTP requests to Google's public flight search endpoint.

## Architecture

### How it works

1. Search parameters (airports, dates, passengers, seat class) are encoded using Protocol Buffers into a base64 `tfs` URL parameter
2. A plain HTTP GET request is made to `google.com/travel/flights` with browser-like headers
3. The response HTML (2-10MB) contains embedded JSON in `AF_initDataCallback` blocks
4. Flight data is extracted from the `ds:1` callback at `ds1[3][0]` (offers) and `ds1[5][10][0]` (date grid)

### Key files

- `shared/src/flights-client/flights-client.ts` — Core logic: protobuf encoding, HTTP fetching, response parsing
- `shared/src/flights-client/types.ts` — All TypeScript interfaces
- `shared/src/flights.proto` — Protobuf schema for search parameters
- `shared/src/tools/` — Individual MCP tool implementations

### Data structure (per flight offer in ds1[3][0])

```
offer[0] = flight details:
  [0] = airline IATA code
  [1] = [airline name]
  [2] = array of segments, each:
    [2] = operated by (optional)
    [3] = origin code, [4] = origin name
    [5] = dest name, [6] = dest code
    [8] = departure [hour, minute?]
    [10] = arrival [hour, minute?]
    [11] = duration minutes
    [17] = aircraft type
    [20] = departure date [y,m,d]
    [21] = arrival date [y,m,d]
    [22] = [carrier, flight_number, null, marketing_carrier]
    [30] = legroom
  [3] = origin, [4] = dep date, [5] = dep time
  [6] = destination, [7] = arr date, [8] = arr time
  [9] = total duration minutes
  stops = segments.length - 1
offer[1][0] = [null, price]
offer[1][1] = booking token
offer[4][6] = [carry_on_flag, checked_bag_flag] (0=included, 1+=not/fee)
offer[5][0] = is_best (1/0)
details[22][2] = fare tier (1=Economy, 2=Economy+, 3=Economy Flex)
```

### Rate limiting

Built-in 1.5s delay between requests. Google does not serve CAPTCHAs for normal usage patterns.

## Development

```bash
npm install        # Install all workspace dependencies
npm run build      # Build shared + local
npm run dev        # Development mode with auto-reload
npm run test:manual # Run manual tests against real Google Flights
```

No `.env` file or API keys needed.
