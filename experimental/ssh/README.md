# SSH MCP Server

An MCP (Model Context Protocol) server for SSH remote server management with **SSH agent authentication support**.

This server solves a common problem with SSH MCP servers: support for passphrase-protected SSH keys. By using SSH agent authentication, you can securely connect to remote servers without exposing your key passphrase.

## Highlights

- **SSH Agent Authentication** - Seamlessly works with passphrase-protected SSH keys via SSH agent
- **Private Key File Support** - Alternative authentication via direct private key file
- **Startup Health Check** - Verifies SSH connectivity on startup with clear error messages
- **Command Execution** - Run shell commands on remote servers
- **File Transfer** - Upload and download files via SFTP
- **Directory Listing** - Browse remote file systems
- **Tool Groups** - Control which tools are available (readonly, write, admin)

## Authentication Priority

The server supports multiple authentication methods and will use them in this order:

1. **SSH Agent** (recommended) - If `SSH_AUTH_SOCK` is set or auto-detected
2. **Private Key File** - If `SSH_PRIVATE_KEY_PATH` is set

Both methods can be configured simultaneously. If SSH agent authentication is available, it takes priority. The private key file method is used as a fallback or when the agent is not available.

## Capabilities

### Tools

| Tool                  | Group                  | Description                               |
| --------------------- | ---------------------- | ----------------------------------------- |
| `ssh_connection_info` | readonly, write, admin | Get configured SSH connection information |
| `ssh_list_directory`  | readonly, write, admin | List directory contents on remote server  |
| `ssh_download`        | readonly, write, admin | Download file from remote server via SFTP |
| `ssh_upload`          | write, admin           | Upload file to remote server via SFTP     |
| `ssh_execute`         | admin                  | Execute shell command on remote server    |

### Resources

| Resource       | Description                                             |
| -------------- | ------------------------------------------------------- |
| `ssh://config` | SSH connection configuration and status (for debugging) |

### Tool Groups

Control which tools are available via the `ENABLED_TOOLGROUPS` environment variable:

| Group      | Description                                       |
| ---------- | ------------------------------------------------- |
| `readonly` | Safe operations (connection info, list, download) |
| `write`    | File modifications (upload)                       |
| `admin`    | Full access including command execution           |

**Examples:**

- `ENABLED_TOOLGROUPS="readonly"` - Only allow browsing and downloads
- `ENABLED_TOOLGROUPS="readonly,write"` - Allow file transfers but no command execution
- Not set - All tools enabled (default)

### Startup Health Check

The server performs an SSH connection health check on startup to verify that the configured credentials and host are valid. This provides immediate feedback if there are configuration issues, rather than discovering them during workflow.

**Benefits:**

- **Faster feedback**: Configuration errors surface at startup rather than mid-workflow
- **Clearer error messages**: Startup failures include hints for common issues
- **Improved user experience**: Eliminates ambiguity about server operational status

**Configuration:**

- `SKIP_HEALTH_CHECKS=true` - Skip the health check (useful for lazy connection scenarios)
- `HEALTH_CHECK_TIMEOUT=10000` - Customize the health check timeout (default: 10 seconds)

**Error hints provided for:**

- Authentication failures (SSH key not loaded, wrong key)
- Connection timeouts (host unreachable)
- Connection refused (SSH server not running)
- DNS resolution errors (invalid hostname)

## Quick Start

### Installation

```bash
npx ssh-agent-mcp-server
```

Or install globally:

```bash
npm install -g ssh-agent-mcp-server
```

### Configuration

#### Environment Variables

| Variable               | Required | Description                                 | Default       |
| ---------------------- | -------- | ------------------------------------------- | ------------- |
| `SSH_HOST`             | Yes      | Hostname or IP address of the SSH server    | -             |
| `SSH_USERNAME`         | Yes      | Username for SSH authentication             | -             |
| `SSH_PORT`             | No       | SSH port number                             | `22`          |
| `SSH_AUTH_SOCK`        | No       | Path to SSH agent socket                    | Auto-detected |
| `SSH_PRIVATE_KEY_PATH` | No       | Path to private key file                    | -             |
| `SSH_PASSPHRASE`       | No       | Passphrase for encrypted private key        | -             |
| `SSH_TIMEOUT`          | No       | Connection timeout in milliseconds          | `30000`       |
| `ENABLED_TOOLGROUPS`   | No       | Comma-separated tool groups                 | All enabled   |
| `SKIP_HEALTH_CHECKS`   | No       | Skip SSH connection health check on startup | `false`       |
| `HEALTH_CHECK_TIMEOUT` | No       | Health check timeout in milliseconds        | `10000`       |

### Claude Desktop Configuration

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ssh": {
      "command": "npx",
      "args": ["-y", "ssh-agent-mcp-server"],
      "env": {
        "SSH_HOST": "192.168.1.100",
        "SSH_USERNAME": "deploy",
        "SSH_AUTH_SOCK": "${SSH_AUTH_SOCK}"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

## SSH Agent Authentication (Recommended)

SSH agent authentication is the recommended method for passphrase-protected keys:

1. Ensure your SSH agent is running with your key loaded:

   ```bash
   # Check if agent is running
   ssh-add -l

   # If not, add your key
   ssh-add ~/.ssh/id_ed25519
   ```

2. Pass the `SSH_AUTH_SOCK` environment variable to the MCP server

The server will automatically use the agent for authentication, and your passphrase-protected key stays secure in the agent.

### How It Works

1. Your passphrase-protected key is loaded into the SSH agent via `ssh-add`
2. The agent exposes a Unix socket at `$SSH_AUTH_SOCK`
3. This MCP server connects to that socket via the `ssh2` library
4. The agent signs authentication challenges using your decrypted key
5. Your private key never leaves the agent - the MCP server never sees it

This is more secure than:

- Storing your passphrase in environment variables
- Using unprotected private keys
- Manually entering passphrases

## Tool Details

### ssh_execute

Execute a command on the remote server.

**Parameters:**

- `command` (required): Shell command to execute
- `cwd` (optional): Working directory
- `timeout` (optional): Command timeout in ms

**Example:**

```json
{
  "command": "ls -la /var/log",
  "cwd": "/home/user"
}
```

**Returns:** JSON with stdout, stderr, and exit code

### ssh_upload

Upload a file to the remote server via SFTP.

**Parameters:**

- `localPath` (required): Absolute path to local file
- `remotePath` (required): Destination path on server

### ssh_download

Download a file from the remote server via SFTP.

**Parameters:**

- `remotePath` (required): Path on remote server
- `localPath` (required): Local destination path

### ssh_list_directory

List directory contents on the remote server.

**Parameters:**

- `path` (required): Directory path to list

**Returns:** JSON array with filename, type, size, permissions, modified time

### ssh_connection_info

Get information about the configured SSH connection.

**Returns:** JSON with host, port, username, and authentication details

## Development

```bash
# Install dependencies
npm run install-all

# Build
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
npm run test:integration
```

## License

MIT
