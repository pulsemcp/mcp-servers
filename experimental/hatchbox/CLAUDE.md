# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Hatchbox MCP server.

## Overview

The Hatchbox MCP server provides integration with Hatchbox (https://hatchbox.io/), a Rails hosting platform designed for small businesses. It enables management of environment variables and deployments through the MCP protocol.

## Architecture

This server follows the standard MCP server template architecture with:

- **local/** - Entry point and MCP server setup
- **shared/** - Business logic, tools, and Hatchbox API client
- **tests/** - Comprehensive test suite (functional, integration, manual)

## Hatchbox API Integration

### API Endpoints

The server integrates with the following Hatchbox API endpoints:

1. **Environment Variables API**
   - PUT `https://app.hatchbox.io/api/v1/accounts/{accountId}/apps/{appId}/env_vars`
   - DELETE `https://app.hatchbox.io/api/v1/accounts/{accountId}/apps/{appId}/env_vars`
   - Note: GET endpoint is not available in the Hatchbox API

2. **Deployment Webhooks**
   - POST `https://app.hatchbox.io/webhooks/deployments/{deployKey}?latest=true`
   - POST `https://app.hatchbox.io/webhooks/deployments/{deployKey}?sha={commitSha}`
   - GET `https://app.hatchbox.io/apps/{deployKey}/activities/{activityId}`

### Authentication

- **API Key**: Used for environment variable operations via `Authorization: Bearer {apiKey}` header
- **Deploy Key**: Used for deployment operations, embedded in webhook URLs

### Configuration

The server uses environment variables to avoid repetitive parameters:

- `HATCHBOX_API_KEY` - For API authentication
- `HATCHBOX_ACCOUNT_ID` - The account to operate on
- `HATCHBOX_APP_ID` - The application to manage
- `HATCHBOX_DEPLOY_KEY` - For deployment operations

## Implementation Details

### Tools

The server implements 4 tools:

1. **setEnvVar** - Creates or updates an environment variable (name and value params)
2. **deleteEnvVars** - Deletes one or more environment variables (names array param)
3. **triggerDeploy** - Triggers a deployment (optional SHA param)
4. **checkDeploy** - Checks deployment status (activityId param)

### Environment Variable Management

- The `setEnvVar` tool handles both create and update operations
- The `deleteEnvVars` tool allows batch deletion of environment variables
- The API returns the full list of env vars after updates
- Retrieving env vars is not supported by the API - users must use the Hatchbox web dashboard

### Deployment Management

- Deployments can be triggered for the latest commit or a specific SHA
- The API returns an activity ID that can be used to check status
- Deploy keys are per-application and found in the Hatchbox dashboard

## Testing

### Manual Testing Prerequisites

1. Create a `.env` file in the root directory with:

   ```
   HATCHBOX_API_KEY=your-api-key
   HATCHBOX_ACCOUNT_ID=1852
   HATCHBOX_APP_ID=8540
   HATCHBOX_DEPLOY_KEY=your-deploy-key
   ```

2. Replace the account and app IDs with your actual values from the Hatchbox dashboard

3. Run manual tests with: `npm run test:manual`

### Test Coverage

- **Functional tests**: Test tools with mocked Hatchbox client
- **Integration tests**: Test MCP protocol with mocked API responses
- **Manual tests**: Validate against real Hatchbox API

## Development Workflow

1. **Adding new tools**: Follow the pattern in `shared/src/tools/`
2. **Updating API client**: Modify `shared/src/hatchbox-client/`
3. **Running tests**: Use `npm test` for watch mode during development
4. **Linting**: Run `npm run lint:fix` before committing

## Version History

- **0.0.1** - Initial release with env var and deployment management

## Common Issues and Solutions

### API Key Issues

- Ensure the API key has proper permissions in Hatchbox
- Check that the key is correctly set in environment variables

### Deployment Key Issues

- Each app has its own unique deploy key
- Keys can be rotated in the Hatchbox dashboard

### Rate Limiting

- Hatchbox may have rate limits on API calls
- Implement exponential backoff if needed in future versions
