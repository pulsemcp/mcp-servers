# PulseMCP Admin API Client

This client provides integration with the PulseMCP Admin API for managing newsletter posts and content.

## API Endpoints

The client interacts with the following endpoints:

- `GET /posts` - List posts with search and pagination
- `GET /posts/:slug` - Get a specific post by slug
- `POST /posts` - Create a new post
- `PUT /posts/:slug` - Update an existing post
- `POST /upload_image` - Upload an image file

## Authentication

All requests include the `X-API-Key` header for authentication.

## Response Handling

- The API primarily returns HTML for web interface usage
- We request JSON responses by setting the `Accept: application/json` header
- Error responses include appropriate HTTP status codes

## Form Data

The PulseMCP API expects form-encoded data for POST/PUT requests using Rails conventions:

- Parameters are nested under `post[field_name]`
- Arrays use the `field[]` notation
