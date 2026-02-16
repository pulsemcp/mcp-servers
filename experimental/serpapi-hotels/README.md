# SerpAPI Hotels MCP Server

An MCP server for searching Google Hotels via the [SerpAPI](https://serpapi.com/) API. Search for hotels in any area with date ranges, and get back prices, ratings, reviews, and booking information.

## Tools

| Tool                | Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `search_hotels`     | Search for hotels with filters for price, rating, star class, amenities, and more                           |
| `get_hotel_details` | Get detailed info for a specific hotel including review breakdowns and booking prices from multiple sources |
| `get_hotel_reviews` | Get individual guest reviews with full text, ratings, sub-ratings, and hotel management responses           |

## Quick Start

### Claude Desktop

Add this to your Claude Desktop config file:

```json
{
  "mcpServers": {
    "serpapi-hotels": {
      "command": "npx",
      "args": ["-y", "serpapi-hotels-mcp-server"],
      "env": {
        "SERPAPI_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

### Manual Setup

```bash
# Clone and install
cd experimental/serpapi-hotels
npm run install-all

# Set your API key
export SERPAPI_API_KEY=your_api_key_here

# Build and run
npm run build
cd local && npm start
```

## Configuration

| Variable          | Required | Description                                                               |
| ----------------- | -------- | ------------------------------------------------------------------------- |
| `SERPAPI_API_KEY` | Yes      | Your SerpAPI API key ([get one here](https://serpapi.com/manage-api-key)) |

## Example Usage

### Search for hotels

```
Search for hotels in New York for March 1-5, 2026, sorted by lowest price
```

The `search_hotels` tool will be called with:

- `query`: "Hotels in New York"
- `check_in_date`: "2026-03-01"
- `check_out_date`: "2026-03-05"
- `sort_by`: 3

### Get hotel details

After finding a hotel, use `get_hotel_details` with its `property_token` to get:

- Prices from multiple booking sources (Booking.com, Hotels.com, Expedia, etc.)
- Review breakdown by category (cleanliness, location, service)
- Full amenity list
- Check-in/out times
- Nearby places with travel times

### Read hotel reviews

After finding a hotel, use `get_hotel_reviews` with its `property_token` to get:

- Full review text from Google and third-party sources (TripAdvisor, etc.)
- Reviewer ratings with sub-ratings (rooms, service, location)
- Hotel management responses
- Sorting by most helpful, most recent, highest/lowest score
- Category filtering (from `get_hotel_details` review breakdown)

## Available Filters

| Filter                    | Values                                                   |
| ------------------------- | -------------------------------------------------------- |
| `sort_by`                 | 3 = lowest price, 8 = highest rating, 13 = most reviewed |
| `rating`                  | 7 = 3.5+, 8 = 4.0+, 9 = 4.5+                             |
| `hotel_class`             | "2", "3", "4", "5" (star rating, comma-separated)        |
| `min_price` / `max_price` | Price range per night                                    |
| `free_cancellation`       | true/false                                               |
| `special_offers`          | true/false                                               |
| `eco_certified`           | true/false                                               |
| `vacation_rentals`        | true = search vacation rentals instead                   |

## Development

```bash
npm run install-all    # Install all dependencies
npm run build          # Build the project
npm run dev            # Development mode
npm test               # Run functional tests
npm run test:integration  # Run integration tests
npm run test:manual    # Run manual tests (requires API key)
```

## Project Structure

```
serpapi-hotels/
├── local/              # Stdio transport entry point
│   └── src/
│       ├── index.ts                      # Main entry point
│       └── index.integration-with-mock.ts # Mock entry for integration tests
├── shared/             # Core business logic
│   └── src/
│       ├── server.ts         # MCP server factory
│       ├── tools.ts          # Tool registration
│       ├── resources.ts      # Resource handlers
│       ├── types.ts          # TypeScript types
│       ├── logging.ts        # Logging utilities
│       ├── tools/            # Individual tool implementations
│       │   ├── search-hotels.ts
│       │   ├── get-hotel-details.ts
│       │   └── get-hotel-reviews.ts
│       └── serpapi-client/   # SerpAPI client
│           ├── serpapi-client.integration-mock.ts
│           └── lib/
│               ├── parse-property.ts
│               ├── search-hotels.ts
│               ├── get-hotel-details.ts
│               └── get-hotel-reviews.ts
└── tests/
    ├── functional/       # Unit tests with mocks
    ├── integration/      # Full MCP protocol tests
    ├── manual/           # Real API tests
    └── mocks/            # Mock implementations
```
