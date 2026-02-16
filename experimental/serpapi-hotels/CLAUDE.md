# SerpAPI Hotels MCP Server

## Architecture

This MCP server uses the SerpAPI Google Hotels engine to search for and retrieve hotel information.

### Key Components

- **SerpAPI Client** (`shared/src/serpapi-client/`): HTTP client for the SerpAPI REST API
  - `lib/search-hotels.ts`: Hotel search with filters and pagination
  - `lib/get-hotel-details.ts`: Detailed property info with review breakdowns
- **Tools** (`shared/src/tools/`): MCP tool implementations
  - `search-hotels.ts`: Search with filters (price, rating, class, amenities)
  - `get-hotel-details.ts`: Get full details via property_token
- **Server** (`shared/src/server.ts`): Factory with dependency injection for testability

### Data Flow

1. User calls `search_hotels` with query, dates, and optional filters
2. Tool validates input with Zod schema
3. SerpAPI client builds URL params and calls `https://serpapi.com/search?engine=google_hotels`
4. Response is parsed into typed HotelProperty objects
5. User can then call `get_hotel_details` with a `property_token` from results

### API Details

- **Endpoint**: `https://serpapi.com/search?engine=google_hotels`
- **Auth**: API key passed as `api_key` query parameter
- **Rate limiting**: Managed by SerpAPI (cached searches are free)

## Development Commands

```bash
npm run build          # Build shared + local
npm test               # Functional tests
npm run test:integration  # Integration tests with TestMCPClient
npm run test:manual    # Manual tests (needs SERPAPI_API_KEY in .env)
```
