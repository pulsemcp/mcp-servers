# Hatchbox Client

This directory contains the Hatchbox API client implementation used by the MCP server.

## Overview

The client provides methods to interact with the Hatchbox API:

- Environment variable management (get, set)
- Deployment operations (trigger, check status)

## Implementation Details

### API Endpoints

1. **Environment Variables**

   - GET `/api/v1/accounts/{accountId}/apps/{appId}/env_vars`
   - PUT `/api/v1/accounts/{accountId}/apps/{appId}/env_vars`

2. **Deployments**
   - POST `/webhooks/deployments/{deployKey}?latest=true`
   - POST `/webhooks/deployments/{deployKey}?sha={sha}`
   - GET `/apps/{deployKey}/activities/{activityId}`

### Authentication

- Environment variables use Bearer token authentication
- Deployment webhooks use the deploy key in the URL

### Error Handling

The client provides specific error messages for common HTTP status codes:

- 401/403: Authentication/authorization errors
- 404: Resource not found
- 422: Validation errors

## Testing

- `hatchbox-client.integration-mock.ts` provides a mock implementation for integration tests
- Functional tests should mock individual lib methods
- Manual tests validate against the real Hatchbox API
