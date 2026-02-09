# Vercel Client

This directory contains the Vercel REST API client implementation.

## Structure

- `vercel-client.ts` - Re-exports the IVercelClient interface
- `vercel-client.integration-mock.ts` - Mock implementation for integration tests
- `lib/` - Individual API method implementations

## API Methods

### Deployments (readonly)

- `list-deployments.ts` - List deployments with filtering and pagination
- `get-deployment.ts` - Get deployment details by ID or URL
- `get-deployment-events.ts` - Get build logs/events for a deployment
- `list-projects.ts` - List projects (for project ID lookups)

### Deployments (readwrite)

- `create-deployment.ts` - Create a new deployment (redeploy)
- `cancel-deployment.ts` - Cancel an in-progress deployment
- `delete-deployment.ts` - Delete a deployment
- `promote-deployment.ts` - Promote a deployment to production
- `rollback-deployment.ts` - Rollback to a previous deployment

### Logs

- `get-runtime-logs.ts` - Get runtime logs for a deployment

## Important Notes

- All methods accept `teamParams` for team-scoped operations
- The Vercel API uses Bearer token authentication
- Runtime logs are stored for a maximum of 1 hour
- Build logs use the deployment events endpoint
- Any changes to API methods should be manually tested before merging
