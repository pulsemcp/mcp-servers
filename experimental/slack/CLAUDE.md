# Slack MCP Server - Development Guide

This document provides guidance for working with the Slack MCP Server codebase.

## Architecture Overview

This server follows the same architecture as the Twist MCP Server:

- **shared/** - Core business logic (client, tools, types)
- **local/** - Stdio transport entry point
- **tests/** - Functional, integration, and manual tests

## Key Components

### Slack Client (`shared/src/server.ts`)

The `SlackClient` class implements `ISlackClient` interface and provides:

- `getChannels()` - List accessible channels
- `getChannel()` - Get channel info
- `getMessages()` - Get channel message history
- `getThread()` - Get thread with replies
- `postMessage()` - Post new message or reply
- `updateMessage()` - Edit existing message
- `addReaction()` - Add emoji reaction

### Tools (`shared/src/tools/`)

Each tool is in its own file:

- `get-channels.ts` - List channels
- `get-channel.ts` - Channel info + messages
- `get-thread.ts` - Thread with replies
- `post-message.ts` - New message
- `reply-to-thread.ts` - Thread reply
- `update-message.ts` - Edit message
- `react-to-message.ts` - Add reaction

### API Methods (`shared/src/slack-client/lib/`)

Individual API implementations:

- `get-channels.ts` - conversations.list
- `get-channel.ts` - conversations.info
- `get-messages.ts` - conversations.history
- `get-thread.ts` - conversations.replies
- `post-message.ts` - chat.postMessage
- `update-message.ts` - chat.update
- `add-reaction.ts` - reactions.add

## Slack API Notes

### Authentication

Uses Bot User OAuth Token (`xoxb-...`). Required scopes:

- `channels:read`, `channels:history` - Public channels
- `groups:read`, `groups:history` - Private channels
- `chat:write` - Post/update messages
- `reactions:write` - Add reactions

### Key Concepts

- **Channel ID** - Starts with `C` (e.g., `C1234567890`)
- **Message Timestamp (ts)** - Unique message identifier (e.g., `1234567890.123456`)
- **Thread Timestamp (thread_ts)** - Parent message ts for threading

### Rate Limits

Slack has strict rate limits, especially for:

- `conversations.history` - 1 req/min for non-Marketplace apps (as of May 2025)
- `conversations.replies` - 1 req/min for non-Marketplace apps

## Testing

### Functional Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

### Manual Tests

Requires `.env` with `SLACK_BOT_TOKEN`:

```bash
npm run test:manual
```

## Common Tasks

### Adding a New Tool

1. Create `shared/src/tools/new-tool.ts`
2. Add API method in `shared/src/slack-client/lib/` if needed
3. Add method to `ISlackClient` interface
4. Implement in `SlackClient` class
5. Register in `shared/src/tools.ts`
6. Add tests

### Updating Dependencies

Update in both `shared/package.json` and `local/package.json`:

```bash
cd shared && npm install <package>
cd ../local && npm install <package>
```
