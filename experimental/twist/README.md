# Twist MCP Server

Haven't heard about MCP yet? The easiest way to keep up-to-date is to read our [weekly newsletter at PulseMCP](https://www.pulsemcp.com/).

---

This is an MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) Server integrating MCP Clients with [Twist](https://twist.com)'s team messaging and collaboration platform: manage channels, threads, and messages through a unified interface.

Twist is a team communication app that emphasizes asynchronous communication through organized threads. Unlike traditional chat apps, Twist is designed to reduce information overload by organizing conversations into channels and threads. This server connects directly to their [REST API](https://developer.twist.com/). You will need a [Twist bearer token](https://twist.com/integrations/apps) to get started.

This project is NOT officially affiliated with Twist.

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

**Channel management**: List and retrieve channel information to understand your team's communication structure.

**Thread operations**: Create new threads and access existing ones for organized, topic-focused discussions.

**Message posting**: Add messages to threads programmatically, enabling automated updates and notifications.

**Asynchronous-first**: Designed to work with Twist's philosophy of calm, organized communication that doesn't require immediate responses.

# Capabilities

This server is built and tested on macOS with Claude Desktop. It should work with other MCP clients as well.

| Tool Name               | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `get_channels`          | Get a list of all channels in the workspace.                         |
| `get_channel`           | Get detailed information about a specific channel by ID.             |
| `get_threads`           | Get a list of threads in a channel with optional filtering.          |
| `get_thread`            | Get detailed information about a specific thread including messages. |
| `create_thread`         | Create a new thread in a channel with a title and initial content.   |
| `add_message_to_thread` | Add a new message to an existing thread.                             |

# Usage Tips

- Use `get_channels` first to discover available channels in your workspace
- When creating threads, provide clear, descriptive titles to maintain organization
- Use threading to keep related discussions together - avoid creating multiple threads for the same topic
- The workspace ID is required for most operations and can be configured via environment variable
- Thread and message content supports Markdown formatting for rich text
- All list operations support pagination for workspaces with many items

# Examples

## Discover Channels and Create a Thread

```
User: "Show me all channels in my Twist workspace"
Assistant: I'll get the list of channels in your workspace.

[Uses get_channels tool]

I found 5 channels in your workspace:
1. #general (ID: ch_123) - General discussions
2. #engineering (ID: ch_456) - Engineering team channel
3. #product (ID: ch_789) - Product discussions
...

User: "Create a thread in the engineering channel about the new API design"
Assistant: I'll create a new thread in the #engineering channel.

[Uses create_thread tool with channel_id: ch_456]

I've created a new thread titled "API Design Discussion - v2.0" in the #engineering channel. The thread ID is th_999.
```

## Add to an Existing Thread

```
User: "Add a message to thread th_999 with the latest API documentation link"
Assistant: I'll add that message to the thread.

[Uses add_message_to_thread tool]

I've added your message with the API documentation link to the thread.
```

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
- `tests/integration/` - Integration tests with mocked Twist API
- `tests/manual/` - Manual tests that hit the real Twist API (not run in CI)
- `tests/mocks/` - Mock implementations and test data

See `tests/README.md` for more details on the testing approach.

### Manual Testing

Manual tests are end-to-end system tests that verify the complete integration with the real Twist API. These tests:

- **Require real API credentials** (TWIST_BEARER_TOKEN and TWIST_WORKSPACE_ID environment variables)
- **Hit the actual Twist production API** - not mocked
- **Chain together real API calls** in a realistic workflow
- **Are not run in CI** to avoid API rate limits and dependency on external services
- **Should be run when modifying TwistClient code** or any code that interacts with the external API

To run manual tests:

```bash
# Copy .env.example to .env and add your credentials
cp .env.example .env
# Edit .env to add your real bearer token and workspace ID

# Run manual tests
npm run test:manual

# Run manual tests in watch mode
npm run test:manual:watch
```

# Setup

## Prerequisites

- Node.js v24.2.0 (use `nvm use` if you have nvm installed)
- A [Twist bearer token](https://twist.com/integrations/apps)
- Your Twist workspace ID

## Cheatsheet

| Environment Variable | Description                                                         | Required | Default Value | Example               |
| -------------------- | ------------------------------------------------------------------- | -------- | ------------- | --------------------- |
| `TWIST_BEARER_TOKEN` | Your Twist bearer token. Get one at [twist.com](https://twist.com/) | Y        | N/A           | `Bearer tk_abc123...` |
| `TWIST_WORKSPACE_ID` | Your Twist workspace ID                                             | Y        | N/A           | `12345`               |

## Claude Desktop

Make sure you have a [bearer token from Twist](https://twist.com/integrations/apps) and your workspace ID ready.

Then proceed to your preferred method of configuring the server below. If this is your first time using MCP Servers, you'll want to make sure you have the [Claude Desktop application](https://claude.ai/download) and follow the [official MCP setup instructions](https://modelcontextprotocol.io/quickstart/user).

### Manual Setup

You're going to need Node working on your machine so you can run `npx` commands in your terminal. If you don't have Node, you can install it from [nodejs.org](https://nodejs.org/en/download).

macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`

Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Modify your `claude_desktop_config.json` file to add the following:

```json
{
  "mcpServers": {
    "twist": {
      "command": "npx",
      "args": ["-y", "twist-mcp-server"],
      "env": {
        "TWIST_BEARER_TOKEN": "Bearer your-token-here",
        "TWIST_WORKSPACE_ID": "your-workspace-id"
      }
    }
  }
}
```

Restart Claude Desktop and you should be ready to go!

# Implementation Plan

## Phase 1: Initial Setup ✅

- Create project structure from template
- Write comprehensive README documentation
- Plan API integration approach

## Phase 2: Core Infrastructure

- Set up TypeScript configuration
- Create Twist API client with proper authentication
- Implement error handling and retry logic
- Set up testing infrastructure (functional, integration, manual)

## Phase 3: Tool Implementation

- Implement `get_channels` - List all workspace channels
- Implement `get_channel` - Get specific channel details
- Implement `get_threads` - List threads with filtering options
- Implement `get_thread` - Get thread with messages
- Implement `create_thread` - Create new discussion threads
- Implement `add_message_to_thread` - Post messages to threads

## Phase 4: Testing & Polish

- Write comprehensive unit tests
- Create integration tests with mocked API
- Implement manual tests for real API validation
- Add proper error messages and user feedback
- Document any API limitations or quirks

## Phase 5: Future Enhancements (Post-MVP)

- Add support for thread search
- Implement message editing/deletion
- Add file attachment support
- Support for reactions and mentions
- Workspace user management tools

## Technical Decisions

### API Integration

- Use REST API (https://developer.twist.com/v3/)
- Implement rate limiting and retry logic
- Handle pagination for list operations
- Proper error handling for network issues

### Authentication

- Bearer token authentication via Authorization header
- Workspace ID required for most operations
- Store credentials securely via environment variables

### Tool Design

- Keep tools focused and single-purpose
- Use consistent naming (get*\*, create*\_, add\_\_)
- Return structured data that's easy to consume
- Include helpful error messages for common issues
