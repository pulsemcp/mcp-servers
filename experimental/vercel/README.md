# Vercel MCP Server

An [MCP](https://modelcontextprotocol.io/) server for managing Vercel deployments and viewing application runtime logs through the Vercel REST API.

## Highlights

- **Deployment Management** - List, inspect, create, cancel, delete, promote, and rollback deployments
- **Build & Runtime Logs** - View build logs (events) and runtime application logs for debugging
- **Fine-grained Access Control** - Enable readonly or readwrite tool groups via environment variables
- **Team Support** - Scope operations to a specific Vercel team

## Capabilities

### Tools

| Tool                    | Group     | Description                                                   |
| ----------------------- | --------- | ------------------------------------------------------------- |
| `list_deployments`      | readonly  | List deployments with filtering by project, target, and state |
| `get_deployment`        | readonly  | Get detailed deployment information by ID or URL              |
| `list_projects`         | readonly  | List projects in the account/team                             |
| `get_deployment_events` | readonly  | Get build logs for a deployment                               |
| `get_runtime_logs`      | readonly  | Get runtime application logs (last 1 hour)                    |
| `create_deployment`     | readwrite | Create a new deployment or redeploy                           |
| `cancel_deployment`     | readwrite | Cancel an in-progress deployment                              |
| `delete_deployment`     | readwrite | Delete a deployment permanently                               |
| `promote_deployment`    | readwrite | Promote a deployment to production                            |
| `rollback_deployment`   | readwrite | Rollback to a previous deployment                             |

## Setup

### Prerequisites

- A Vercel account with an API token ([create one here](https://vercel.com/account/tokens))
- Node.js 18+

### Configuration

| Variable                    | Required | Description                                                         |
| --------------------------- | -------- | ------------------------------------------------------------------- |
| `VERCEL_TOKEN`              | Yes      | Vercel API token                                                    |
| `VERCEL_TEAM_ID`            | No       | Team ID for team-scoped operations                                  |
| `VERCEL_TEAM_SLUG`          | No       | Team URL slug (alternative to team ID)                              |
| `VERCEL_ENABLED_TOOLGROUPS` | No       | Comma-separated tool groups: `readonly`, `readwrite` (default: all) |

### Manual Setup

```bash
# Clone the repository
git clone https://github.com/pulsemcp/mcp-servers.git
cd mcp-servers/experimental/vercel

# Install dependencies
npm install

# Build
npm run build

# Set environment variables
export VERCEL_TOKEN="your-token-here"

# Run
npm start
```

## Usage Tips

- Use `list_projects` first to find project IDs needed by `promote_deployment`, `rollback_deployment`, and `get_runtime_logs`
- Runtime logs are only available for the last 1 hour - use `get_deployment_events` for build logs which persist longer
- Set `VERCEL_ENABLED_TOOLGROUPS=readonly` to prevent any write operations
- Use `list_deployments` with the `state` filter to quickly find failed or in-progress deployments

## Examples

### Check deployment status

> "What's the status of my latest deployments?"

Uses `list_deployments` to show recent deployments with their states.

### Debug a failed build

> "Show me the build logs for deployment dpl_abc123"

Uses `get_deployment_events` to display the build output and error messages.

### Promote a preview to production

> "Promote deployment dpl_abc123 to production for project prj_xyz789"

Uses `promote_deployment` to make a preview deployment serve production traffic.

### View runtime errors

> "Show me the runtime logs for my-app's latest deployment"

Uses `list_projects` to find the project ID, then `get_runtime_logs` to show recent application logs.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run functional tests
npm test

# Run integration tests
npm run test:integration

# Run manual tests (requires .env with VERCEL_TOKEN)
npm run test:manual

# Lint
npm run lint
```
