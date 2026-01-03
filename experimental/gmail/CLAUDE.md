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

The server uses Google Cloud service accounts with domain-wide delegation:

- Service account credentials are provided via environment variables:
  - `GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL`: The service account email address
  - `GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY`: The private key in PEM format
- Impersonates a Workspace user specified by `GMAIL_IMPERSONATE_EMAIL`
- Requires `gmail.readonly` scope granted in Google Workspace Admin
- JWT tokens are automatically refreshed before expiry

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
export GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL="my-service-account@my-project.iam.gserviceaccount.com"
export GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
export GMAIL_IMPERSONATE_EMAIL="user@yourdomain.com"
npm run test:manual
```

## Common Issues

### Authentication Errors

If you see 401 or 403 errors:

- Verify service account email and private key are correctly set
- Check that the service account has domain-wide delegation enabled
- Ensure `gmail.readonly` scope is granted in Google Workspace Admin Console
- Verify the impersonate email is a valid Workspace user

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
