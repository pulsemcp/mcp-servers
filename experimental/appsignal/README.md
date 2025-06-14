<div align="center">
 <h1><img src="https://github.com/pulsemcp/mcp-servers/blob/main/appsignal/images/appsignal-mcp-logo.png" width="160px"><br/>AppSignal MCP Server</h1>
 <img src="https://img.shields.io/github/license/pulsemcp/mcp-servers?style=flat-square&color=purple"/>
 <img src="https://github.com/pulsemcp/mcp-servers/actions/workflows/appsignal-ci.yml/badge.svg" alt="CI Status"/>
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

| Tool Name                       | Description                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------- |
| `get_apps`                      | Get a list of all available AppSignal applications.                               |
| `select_app_id`                 | Select an AppSignal application ID to use for subsequent operations.              |
| `get_exception_incident`        | Get detailed information about a specific exception incident.                     |
| `get_exception_incident_sample` | Get a sample occurrence of a specific exception incident.                         |
| `get_log_incident`              | Get detailed information about a specific log incident.                           |
| `get_anomaly_incident`          | Get detailed information about a specific anomaly incident.                       |
| `search_logs`                   | Search through application logs with flexible query parameters and filters.       |
| `get_log_incidents`             | Get a list of log incidents with optional state filter (OPEN, CLOSED, WIP).       |
| `get_exception_incidents`       | Get a list of exception incidents with optional state filter (OPEN, CLOSED, WIP). |
| `get_anomaly_incidents`         | Get a list of anomaly incidents with optional state filter (OPEN, CLOSED, WIP).   |

# Usage Tips

- All log searches support flexible query syntax - you can search for exact phrases, keywords, or use AppSignal's query language
- Alert IDs can be found in your AppSignal dashboard or through alert notifications
- Use the tools in combination to investigate issues - get alert details first, then search related logs
- The list tools (`get_log_incidents`, `get_exception_incidents`, `get_anomaly_incidents`) support filtering by state:
  - OPEN: Active incidents requiring attention
  - CLOSED: Resolved incidents
  - WIP: Work-in-progress incidents being investigated
- By default, list tools return only OPEN incidents if no state filter is provided

# Development

## Testing

This project uses [Vitest](https://vitest.dev/) for unit testing. Tests are automatically run on pull requests and pushes to the main branch.

### Running Tests Locally

```bash
# Install dependencies
npm run install-all

# Run tests once
npm run test:run

# Run tests in watch mode (recommended for development)
npm test

# Run tests with UI
npm run test:ui
```

### Test Structure

Tests are located in the `tests/` directory:

- `tests/functional/` - Functional tests for individual components
- `tests/integration/` - Integration tests with mocked AppSignal API
- `tests/manual/` - Manual tests that hit the real AppSignal API (not run in CI)
- `tests/mocks/` - Mock implementations and test data

See `tests/README.md` for more details on the testing approach.

### Manual Testing

Manual tests are end-to-end system tests that verify the complete integration with the real AppSignal API. These tests:

- **Require real API credentials** (APPSIGNAL_API_KEY environment variable)
- **Hit the actual AppSignal production API** - not mocked
- **Chain together real API calls** in a realistic workflow
- **Are not run in CI** to avoid API rate limits and dependency on external services
- **Should be run when modifying AppsignalClient code** or any code that interacts with the external API

The manual test suite follows this workflow:

1. Lists all available apps using your API key
2. Automatically selects the first app
3. Searches for logs in that app
4. Tests various search patterns and error scenarios
5. Provides detailed console output showing the actual API responses

To run manual tests:

```bash
# Copy .env.example to .env and add your API key
cp .env.example .env
# Edit .env to add your real API key

# Run manual tests
npm run test:manual

# Run manual tests in watch mode
npm run test:manual:watch
```

**Test Outcomes:**

- **SUCCESS** ✅ - All critical tests passed, full happy path completed
- **WARNING** ⚠️ - Core functionality works but some features couldn't be fully validated (e.g., no data available or API limitations)
- **FAILURE** ❌ - Verifiable breakage in the integration

The tests automatically adapt to your AppSignal data and API limitations.

# Setup

## Cheatsheet

| Environment Variable | Description                                                                | Required | Default Value | Example                    |
| -------------------- | -------------------------------------------------------------------------- | -------- | ------------- | -------------------------- |
| `APPSIGNAL_API_KEY`  | Your AppSignal API key. Get one at [appsignal.com](https://appsignal.com/) | Y        | N/A           | `your-api-key-here`        |
| `APPSIGNAL_APP_ID`   | Your AppSignal application ID                                              | N        | N/A           | `5f3e4d2c1b0a9f8e7d6c5b4a` |

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
      "args": ["-y", "mcp-server-appsignal"],
      "env": {
        "APPSIGNAL_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!
