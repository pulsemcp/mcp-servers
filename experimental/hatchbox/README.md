# Hatchbox MCP Server

An MCP server for Hatchbox - Rails hosting made simple for small businesses.

<div align="center">
  <img src="https://hatchbox.io/assets/logo.svg" alt="Hatchbox Logo" width="200" />
</div>

## Overview

This MCP server provides tools to interact with Hatchbox's API, allowing you to manage environment variables and deployments for your Rails applications directly from your AI assistant.

### Key Features

- **Environment Variable Management**:
  - View all environment variables (via SSH)
  - Get specific environment variables (via SSH)
  - Set and update environment variables
  - Delete environment variables
- **Deployment Control**: Trigger deployments and check their status
- **Security Features**:
  - Read-only mode by default
  - Configurable deployment permissions
  - SSH-based secure access for reading env vars
- **Secure Authentication**: Uses API keys and SSH keys for secure access

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

#### Required Variables

- `HATCHBOX_API_KEY`: Your Hatchbox API key for authentication
- `HATCHBOX_ACCOUNT_ID`: Your Hatchbox account ID
- `HATCHBOX_APP_ID`: Your Hatchbox application ID
- `HATCHBOX_DEPLOY_KEY`: Your deployment webhook key

#### Optional Variables for SSH Access

- `WEB_SERVER_IP_ADDRESS`: IP address of your Hatchbox server (enables getEnvVars and getEnvVar tools)
- `SSH_KEY_PATH`: Path to SSH private key (defaults to ~/.ssh/id_rsa)
- `HATCHBOX_APP_NAME`: App name to filter processes if multiple apps on server (see example below)

#### Security Configuration

- `READONLY`: Set to `false` to enable write operations (default: `true`)
- `ALLOW_DEPLOYS`: Set to `false` to disable deployment operations (default: `true`)

You can find these values in your Hatchbox dashboard:

- API key: Account settings
- Account ID: Visible in the URL when viewing your account
- App ID: Visible in the URL when viewing your application
- Deploy key: Application deployment settings
- Server IP: Your server's public IP address (for SSH access)

### SSH Setup (Optional - for reading env vars)

To enable the `getEnvVars` and `getEnvVar` tools, you need SSH access to your Hatchbox server:

1. **Add your SSH public key** to the deploy user on your Hatchbox server:

   ```bash
   ssh-copy-id deploy@your-server-ip
   ```

2. **Test SSH access**:

   ```bash
   ssh deploy@your-server-ip "echo 'SSH access working'"
   ```

3. **Configure the MCP server** with your server's IP address (see configuration below)

#### Multiple Apps on Same Server

If you have multiple Rails applications running on the same Hatchbox server, you'll need to specify the `HATCHBOX_APP_NAME` to identify which app's environment variables to read:

```bash
# Example: If your server has multiple apps running
# App 1: mystore (running on port 3000)
# App 2: blog (running on port 3001)
# App 3: api (running on port 3002)

# To read env vars for the 'mystore' app:
HATCHBOX_APP_NAME=mystore

# To read env vars for the 'blog' app:
HATCHBOX_APP_NAME=blog
```

The app name should match the name shown in your Hatchbox dashboard. This filters the process list to find the correct puma process for your specific application.

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
        "HATCHBOX_DEPLOY_KEY": "your-deploy-key-here",

        "// Optional - for SSH access to read env vars": "",
        "WEB_SERVER_IP_ADDRESS": "165.232.133.75",
        "SSH_KEY_PATH": "/Users/yourname/.ssh/id_rsa",
        "HATCHBOX_APP_NAME": "myapp",

        "// Optional - security settings": "",
        "READONLY": "false",
        "ALLOW_DEPLOYS": "true"
      }
    }
  }
}
```

## Tools

### Environment Variables

#### `getEnvVars`

Get all environment variables from the Hatchbox server via SSH.

**Requirements:** WEB_SERVER_IP_ADDRESS must be configured.

**Parameters:** None

**Example:**

```
"Show me all environment variables"
```

#### `getEnvVar`

Get a specific environment variable from the Hatchbox server via SSH.

**Requirements:** WEB_SERVER_IP_ADDRESS must be configured.

**Parameters:**

- `name` (string, required): The name of the environment variable to retrieve

**Example:**

```json
{
  "name": "RAILS_ENV"
}
```

#### `setEnvVar`

Set or update an environment variable.

**Requirements:** READONLY must be set to `false`.

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

**Requirements:** READONLY must be set to `false`.

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

**Requirements:** ALLOW_DEPLOYS must be set to `true` (default).

**Parameters:**

- `sha` (string, optional): Specific commit SHA to deploy (latest if not provided)

**Example:**

```json
{
  "sha": "abc123def456"
}
```

#### `checkDeploy`

Check the status of a deployment.

**Requirements:** ALLOW_DEPLOYS must be set to `true` (default).

**Parameters:**

- `activityId` (string, required): The deployment activity ID returned from triggerDeploy

**Example:**

```json
{
  "activityId": "12345"
}
```

## Usage Examples

Here are some example queries you can use with Claude:

### Reading Environment Variables (requires WEB_SERVER_IP_ADDRESS)

1. **View all environment variables:**
   "Show me all environment variables"

2. **Get a specific variable:**
   "What is the value of RAILS_ENV?"

### Writing Environment Variables (requires READONLY=false)

3. **Set an environment variable:**
   "Set the RAILS_ENV to production"

4. **Delete environment variables:**
   "Delete the OLD_VAR and UNUSED_VAR environment variables"

### Deployments (requires ALLOW_DEPLOYS=true)

5. **Deploy the latest code:**
   "Deploy the latest commit to Hatchbox"

6. **Deploy a specific commit:**
   "Deploy commit abc123def456 to Hatchbox"

7. **Check deployment status:**
   "Check the status of deployment activity 12345"

## Security Notes

### API Security

- Store your API keys securely and never commit them to version control
- The server only has access to the Hatchbox accounts and applications that your API key can access

### SSH Security

- SSH access exposes ALL environment variables including secrets
- Ensure your SSH key is properly secured
- Consider using a dedicated read-only SSH key if possible
- Only configure WEB_SERVER_IP_ADDRESS if you trust the MCP client with your secrets

### Permission Modes

- **Read-only mode (default)**: Prevents accidental modifications to your production environment
- **Deployment control**: Can be disabled separately from write operations
- Configure permissions based on your security requirements:
  - Development: `READONLY=false`, `ALLOW_DEPLOYS=true`
  - Staging: `READONLY=false`, `ALLOW_DEPLOYS=true`
  - Production: `READONLY=true`, `ALLOW_DEPLOYS=false` (recommended)
- All API communications are encrypted using HTTPS

## Development

This server is part of the PulseMCP organization's collection of MCP servers. For development instructions and contribution guidelines, see the main repository.

## License

This project is licensed under the MIT License.
