# Hatchbox MCP Server

An MCP server for Hatchbox - Rails hosting made simple for small businesses.

<div align="center">
  <img src="https://hatchbox.io/assets/logo.svg" alt="Hatchbox Logo" width="200" />
</div>

## Overview

This MCP server provides tools to interact with Hatchbox's API, allowing you to manage environment variables and deployments for your Rails applications directly from your AI assistant.

### Key Features

- **Environment Variable Management**: Set and delete environment variables (Note: retrieving env vars is not supported by the Hatchbox API)
- **Deployment Control**: Trigger deployments and check their status
- **Secure Authentication**: Uses API keys for secure access to your Hatchbox account

## Installation

### Installing via Smithery

To install Hatchbox MCP Server for Claude Desktop automatically via [Smithery](https://smithery.ai/):

```bash
npx -y @smithery/cli install hatchbox-mcp-server --client claude
```

### Manual Installation

```bash
npm install hatchbox-mcp-server
```

## Configuration

### Environment Variables

The server requires the following environment variables:

- `HATCHBOX_API_KEY` (required): Your Hatchbox API key for authentication
- `HATCHBOX_ACCOUNT_ID` (required): Your Hatchbox account ID
- `HATCHBOX_APP_ID` (required): Your Hatchbox application ID
- `HATCHBOX_DEPLOY_KEY` (required): Your deployment webhook key

You can find these values in your Hatchbox dashboard:

- API key: Account settings
- Account ID: Visible in the URL when viewing your account
- App ID: Visible in the URL when viewing your application
- Deploy key: Application deployment settings

### Claude Desktop Configuration

Add the server to your Claude Desktop configuration file:

#### macOS

`~/Library/Application Support/Claude/claude_desktop_config.json`

#### Windows

`%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "hatchbox": {
      "command": "npx",
      "args": ["-y", "hatchbox-mcp-server"],
      "env": {
        "HATCHBOX_API_KEY": "your-api-key-here",
        "HATCHBOX_ACCOUNT_ID": "1852",
        "HATCHBOX_APP_ID": "8540",
        "HATCHBOX_DEPLOY_KEY": "your-deploy-key-here"
      }
    }
  }
}
```

## Tools

### Environment Variables

#### `getEnvVars`

**Note:** This operation is not supported by the Hatchbox API. The API only allows setting and deleting environment variables, not retrieving them. To view your environment variables, please use the Hatchbox web dashboard.

**Parameters:** None

**Returns:** An error message indicating this operation is not supported

#### `getEnvVar`

**Note:** This operation is not supported by the Hatchbox API. The API only allows setting and deleting environment variables, not retrieving them. To view your environment variables, please use the Hatchbox web dashboard.

**Parameters:**

- `name` (string, required): The environment variable name

**Returns:** An error message indicating this operation is not supported

#### `setEnvVar`

Set or update an environment variable.

**Parameters:**

- `name` (string, required): The environment variable name
- `value` (string, required): The environment variable value

**Example:**

```json
{
  "name": "DATABASE_URL",
  "value": "postgres://user:pass@host:5432/dbname"
}
```

#### `deleteEnvVars`

Delete one or more environment variables.

**Parameters:**

- `names` (array of strings, required): Array of environment variable names to delete

**Example:**

```json
{
  "names": ["OLD_VAR", "UNUSED_VAR"]
}
```

### Deployments

#### `triggerDeploy`

Trigger a new deployment for your application.

**Parameters:**

- `deployKey` (string, optional): Deployment webhook key (uses env var if not provided)
- `sha` (string, optional): Specific commit SHA to deploy (latest if not provided)

**Example:**

```json
{
  "sha": "abc123def456"
}
```

#### `checkDeploy`

Check the status of a deployment.

**Parameters:**

- `deployKey` (string, optional): Deployment webhook key (uses env var if not provided)
- `activityId` (string, required): The deployment activity ID returned from triggerDeploy

**Example:**

```json
{
  "activityId": "12345"
}
```

## Usage Examples

Here are some example queries you can use with Claude:

1. **Set an environment variable:**
   "Set the RAILS_ENV to production"

2. **Update an environment variable:**
   "Set the RAILS_ENV to production"

3. **Delete environment variables:**
   "Delete the OLD_VAR and UNUSED_VAR environment variables"

4. **Deploy the latest code:**
   "Deploy the latest commit to Hatchbox"

5. **Deploy a specific commit:**
   "Deploy commit abc123def456 to Hatchbox"

6. **Check deployment status:**
   "Check the status of deployment activity 12345"

## Security Notes

- Store your API keys securely and never commit them to version control
- The server only has access to the Hatchbox accounts and applications that your API key can access
- All API communications are encrypted using HTTPS

## Development

This server is part of the PulseMCP organization's collection of MCP servers. For development instructions and contribution guidelines, see the main repository.

## License

This project is licensed under the MIT License.
