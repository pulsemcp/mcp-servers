# Proctor MCP Server

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server for running Proctor exams against MCP servers. It provides tools for executing tests, managing exam infrastructure, and tracking test results through direct integration with the [PulseMCP Proctor API](https://admin.pulsemcp.com).

**Note**: This is an internal tool for the PulseMCP team. The source code is public for reference purposes, but the server requires API keys that are not publicly available.

# Table of Contents

- [Highlights](#highlights)
- [Capabilities](#capabilities)
- [Tool Groups](#tool-groups)
- [Usage Tips](#usage-tips)
- [Examples](#examples)
- [Setup](#setup)
  - [Cheatsheet](#cheatsheet)
  - [Claude Desktop](#claude-desktop)
    - [Manual Setup](#manual-setup)

# Highlights

**Exam Execution**: Run Proctor exams against MCP servers to test functionality and protocol compliance.

**Result Management**: Save and retrieve exam results for comparison and regression testing.

**Infrastructure Control**: List, manage, and clean up Fly.io machines used for exam execution.

**Tool Groups**: Enable/disable tool groups via `TOOL_GROUPS` environment variable. Each group has a base variant (full access) and a `_readonly` variant (read-only access).

**Streaming Results**: Real-time exam execution logs with NDJSON streaming.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name              | Tool Group | Read/Write | Description                                           |
| ---------------------- | ---------- | ---------- | ----------------------------------------------------- |
| `get_proctor_metadata` | exams      | read       | Get available runtimes and exams for Proctor testing. |
| `run_exam`             | exams      | write      | Execute a Proctor exam against an MCP server.         |
| `get_machines`         | machines   | read       | List active Fly.io machines used for Proctor exams.   |
| `destroy_machine`      | machines   | write      | Delete a Fly.io machine.                              |
| `cancel_exam`          | machines   | write      | Cancel a running Proctor exam.                        |

# Tool Groups

This server organizes tools into groups that can be selectively enabled or disabled. Each group has two variants:

- **Base group** (e.g., `exams`): Full read + write access
- **Readonly group** (e.g., `exams_readonly`): Read-only access

## Available Groups

| Group               | Tools | Description                            |
| ------------------- | ----- | -------------------------------------- |
| `exams`             | 2     | Full exam execution (read + write)     |
| `exams_readonly`    | 1     | Exam metadata (read only)              |
| `machines`          | 3     | Full machine management (read + write) |
| `machines_readonly` | 1     | Machine listing (read only)            |

### Tools by Group

- **exams** / **exams_readonly**:
  - Read-only: `get_proctor_metadata`
  - Write: `run_exam`
- **machines** / **machines_readonly**:
  - Read-only: `get_machines`
  - Write: `destroy_machine`, `cancel_exam`

## Environment Variables

| Variable          | Description                                 | Default                       |
| ----------------- | ------------------------------------------- | ----------------------------- |
| `PROCTOR_API_KEY` | API key for PulseMCP Proctor API (required) | -                             |
| `PROCTOR_API_URL` | Base URL for Proctor API                    | `https://admin.pulsemcp.com`  |
| `TOOL_GROUPS`     | Comma-separated list of enabled tool groups | `exams,machines` (all groups) |

## Examples

Enable all tools with full access (default):

```bash
# No TOOL_GROUPS needed - all base groups enabled
```

Enable only exam tools:

```bash
TOOL_GROUPS=exams
```

Enable machines with read-only access:

```bash
TOOL_GROUPS=machines_readonly
```

Enable all groups with read-only access:

```bash
TOOL_GROUPS=exams_readonly,machines_readonly
```

Mix full and read-only access per group:

```bash
# Full exam access, read-only machines
TOOL_GROUPS=exams,machines_readonly
```

# Usage Tips

- Use `get_proctor_metadata` to discover available runtimes and exam types
- Run exams with `run_exam` to test MCP servers with streaming progress logs
- Use `get_machines` to monitor active exam infrastructure
- Clean up machines with `destroy_machine` when no longer needed
- Use `cancel_exam` to stop a stuck or slow exam before destroying the machine

# Examples

## Get Available Exams

```
User: What exams can I run with Proctor?
Assistant: I'll check what exams are available.

[Calls get_proctor_metadata]

Here are the available exams:

**Runtimes:**
- Proctor v0.0.37 (id: v0.0.37)

**Exams:**
- Auth Check (id: proctor-mcp-client-auth-check) - Verifies authentication mechanisms
- Init Tools List (id: proctor-mcp-client-init-tools-list) - Tests initialization and tool listing
```

## Monitor Infrastructure

```
User: What machines are currently running?
Assistant: I'll check the active Fly machines.

[Calls get_machines]

There are 2 active machines:

1. **machine-abc123** - Running in sjc region (created 10 minutes ago)
2. **machine-def456** - Stopped in iad region (created 1 hour ago)
```

# Setup

## Claude Desktop

Make sure you have your Proctor API key ready.

Then proceed to the setup instructions below. If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

### Manual Setup

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "proctor": {
      "command": "npx",
      "args": ["-y", "proctor-mcp-server"],
      "env": {
        "PROCTOR_API_KEY": "your-api-key-here",
        "TOOL_GROUPS": "exams,machines"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

For read-only access:

```json
{
  "mcpServers": {
    "proctor-readonly": {
      "command": "npx",
      "args": ["-y", "proctor-mcp-server"],
      "env": {
        "PROCTOR_API_KEY": "your-api-key-here",
        "TOOL_GROUPS": "exams_readonly,machines_readonly"
      }
    }
  }
}
```

## Development

### Quick Setup

```bash
# Install dependencies
npm run install-all

# Build the server
npm run build

# Set your API key
export PROCTOR_API_KEY="your-api-key-here"

# Run the server
cd local && npm start
```

## License

MIT
