# PulseMCP Admin API Client

This client provides integration with the PulseMCP Admin API for managing newsletter posts and content.

## API Endpoints

The client currently uses the following endpoints:

### Posts

- `GET /posts` - List posts with search and pagination (returns JSON with data/meta structure)
- `GET /supervisor/posts/:slug` - Get a specific post by slug (returns JSON with full content including body)
- `POST /posts` - Create a new post (returns JSON)
- `PUT /posts/:slug` - Update an existing post (returns JSON)
- `POST /upload_image` - Upload an image file (returns JSON)

### Other Resources

- `GET /supervisor/authors` - List authors (returns JSON with data/meta structure)
- `GET /supervisor/authors/:slug` - Get author by slug (returns JSON)
- `GET /supervisor/mcp_servers` - List MCP servers (returns JSON with data/meta structure)
- `GET /supervisor/mcp_servers/:slug` - Get MCP server by slug (returns JSON)
- `GET /supervisor/mcp_clients` - List MCP clients (returns JSON with data/meta structure)
- `GET /supervisor/mcp_clients/:slug` - Get MCP client by slug (returns JSON)

All endpoints use real API calls and return live data from the Rails application.

## Authentication

All requests include the `X-API-Key` header for authentication.

## Response Handling

- The API returns JSON responses when the `Accept: application/json` header is included
- All endpoints listed above support JSON format
- Error responses include appropriate HTTP status codes with JSON error messages

## Form Data

The PulseMCP API expects form-encoded data for POST/PUT requests using Rails conventions:

- Parameters are nested under `post[field_name]`
- Arrays use the `field[]` notation
