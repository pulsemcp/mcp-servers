# Gmail MCP Server - Development Guide

This document provides guidance for developing and maintaining the Gmail MCP server.

## Architecture Overview

This server follows the standard PulseMCP MCP server architecture:

- **shared/**: Core business logic and Gmail client
  - `server.ts`: Server factory and Gmail client interface
  - `tools.ts`: Tool registration
  - `tools/`: Individual tool implementations
  - `gmail-client/lib/`: Gmail API client methods
  - `types.ts`: TypeScript type definitions
  - `logging.ts`: Centralized logging utilities

- **local/**: Stdio transport entry point
  - `src/index.ts`: Main entry point with environment validation
  - `src/index.integration-with-mock.ts`: Mock server for integration tests

- **tests/**: Test suites
  - `functional/`: Unit tests with mocked client
  - `integration/`: MCP protocol tests with TestMCPClient
  - `manual/`: Real API tests (require GMAIL_ACCESS_TOKEN)
  - `mocks/`: Mock implementations

## Gmail API Integration

### Authentication

The server uses OAuth2 access tokens for authentication. Access tokens:

- Must have `gmail.readonly` scope
- Are short-lived and need periodic refresh
- Should be obtained via the OAuth2 flow

### API Endpoints Used

- `GET /gmail/v1/users/me/messages` - List messages
- `GET /gmail/v1/users/me/messages/{id}` - Get message details

### Email Body Decoding

Gmail returns email bodies as base64url-encoded strings. The `get-email.ts` tool:

1. Decodes base64url to UTF-8
2. Prefers plain text over HTML
3. Strips HTML tags when falling back to HTML content

## Testing

### Functional Tests

Test individual tools with mocked Gmail client:

```bash
npm test
```

### Integration Tests

Test full MCP protocol with mock server:

```bash
npm run test:integration
```

### Manual Tests

Test against real Gmail API:

```bash
export GMAIL_ACCESS_TOKEN="your-token"
npm run test:manual
```

## Common Issues

### Access Token Expiration

OAuth2 access tokens typically expire after 1 hour. If you see 401 errors:

- Refresh the access token
- Check token scope includes `gmail.readonly`

### Rate Limiting

Gmail API has usage quotas. If you hit limits:

- Implement exponential backoff
- Reduce request frequency
- Request quota increase if needed

## Future Enhancements

Potential features to add:

- Send email functionality (`gmail.send` scope required)
- Label management
- Thread-based operations
- Attachment download
- Search with more advanced queries
