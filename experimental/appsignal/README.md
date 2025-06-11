<div align="center">
 <h1><img src="https://github.com/pulsemcp/mcp-servers/blob/main/appsignal/images/appsignal-mcp-logo.png" width="160px"><br/>AppSignal MCP Server</h1>
 <img src="https://img.shields.io/github/license/pulsemcp/mcp-servers?style=flat-square&color=purple"/>
</div>

<br/>

<br/>

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server integrating MCP Clients with [AppSignal](https://www.appsignal.com/)'s application performance monitoring and error tracking capabilities: get alert details, search logs, and retrieve logs within specific time ranges.

AppSignal is a comprehensive APM (Application Performance Monitoring) solution that helps developers monitor their applications' performance, track errors, and debug issues. This server connects directly to their [REST API](https://docs.appsignal.com/api/). You will need to sign up for an [API Key from AppSignal](https://appsignal.com/users/sign_up) to get started.

This project is NOT officially affiliated with AppSignal.

# Table of Contents

- [Highlights](#highlights)
- [Capabilities](#capabilities)
- [Usage Tips](#usage-tips)
- [Examples](#examples)
- [Setup](#setup)
  - [Cheatsheet](#cheatsheet)
  - [Claude Desktop](#claude-desktop)
    - [Manual Setup](#manual-setup)

# Highlights

**Real-time monitoring integration**: Access your application's alerts, errors, and logs directly within Claude or other MCP clients, enabling seamless debugging and monitoring workflows.

**Powerful log searching**: Search through your application logs with flexible query options, making it easy to find specific issues or patterns.

**Time-based log retrieval**: Retrieve logs within specific datetime ranges for focused analysis of incidents or debugging time-sensitive issues.

**Zero context switching**: No need to leave your conversation to check alerts or search logs - everything is integrated directly into your MCP client.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name                     | Description                                                                                            |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `get_alert_details`           | Get detailed information about a specific alert, including status, triggers, and affected services.    |
| `search_logs`                 | Search through application logs with flexible query parameters and filters.                            |
| `get_logs_in_datetime_range`  | Retrieve logs within a specific datetime range for focused incident analysis.                          |

# Usage Tips

- All log searches support flexible query syntax - you can search for exact phrases, keywords, or use AppSignal's query language
- Datetime ranges should be provided in ISO 8601 format (e.g., "2024-01-15T10:00:00Z")
- Alert IDs can be found in your AppSignal dashboard or through alert notifications
- Use the tools in combination to investigate issues - get alert details first, then search related logs

# Examples

## Get alert details

1. `Get details for alert ID 12345`
2. `Show me information about the database connection alert`
3. `What's the status of alert abc-def-123?`

## Search logs

1. `Search logs for "database connection timeout"`
2. `Find all error logs from the payment service`
3. `Search for logs containing "user authentication failed" in the last hour`
4. `Look for any logs with status code 500`

## Get logs in datetime range

1. `Get all logs between 2024-01-15T10:00:00Z and 2024-01-15T11:00:00Z`
2. `Show me logs from yesterday between 3pm and 4pm UTC`
3. `Retrieve logs for the incident that happened this morning from 9am to 9:30am`
4. `Get logs from the last deployment window (2024-01-15T20:00:00Z to 2024-01-15T20:30:00Z)`

# Setup

## Cheatsheet

| Environment Variable     | Description                                                                        | Required | Default Value | Example                        |
| ----------------------- | ---------------------------------------------------------------------------------- | -------- | ------------- | ------------------------------ |
| `APPSIGNAL_API_KEY`     | Your AppSignal API key. Get one at [appsignal.com](https://appsignal.com/)        | Y        | N/A           | `your-api-key-here`            |
| `APPSIGNAL_APP_ID`      | Your AppSignal application ID                                                      | N        | N/A           | `5f3e4d2c1b0a9f8e7d6c5b4a`     |

## Claude Desktop

Make sure you have an [API key from AppSignal](https://appsignal.com/users/sign_up) and your application ID ready.

Then proceed to your preferred method of configuring the server below. If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

### Manual Setup

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "appsignal": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-server-appsignal"
      ],
      "env": {
        "APPSIGNAL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!