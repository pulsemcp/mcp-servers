# CLAUDE.md - Twist Client

This directory contains the Twist API client implementation for external API interactions.

## Overview

The Twist client provides a clean interface for interacting with the Twist API v3. It handles:

- Authentication via Bearer token
- All major Twist operations (channels, threads, messages)
- Error handling for failed requests

## Structure

```
twist-client/
├── twist-client.ts               # Main exports
├── twist-client.integration-mock.ts  # Mock for integration tests
└── lib/                          # Individual API method implementations
    ├── get-channels.ts           # List all workspace channels
    ├── get-channel.ts            # Get specific channel details
    ├── get-threads.ts            # List threads in a channel
    ├── get-thread.ts             # Get thread with messages
    ├── create-thread.ts          # Create new thread
    └── add-message-to-thread.ts  # Add message to thread
```

## API Methods

### Channel Operations

- `getChannels()` - List all channels in the workspace
- `getChannel(channelId)` - Get details of a specific channel

### Thread Operations

- `getThreads(channelId, options)` - List threads in a channel with optional filtering
- `getThread(threadId)` - Get thread details including all messages
- `createThread(channelId, title, content)` - Create a new thread

### Message Operations

- `addMessageToThread(threadId, content)` - Add a message to an existing thread

## Authentication

The client uses Bearer token authentication. The token should be provided in the format:

- For OAuth2 tokens: `oauth2:YOUR_TOKEN`
- For API tokens: `Bearer YOUR_TOKEN`

The client automatically adds the `Authorization` header to all requests.

## Error Handling

All methods throw errors when:

- Network requests fail
- API returns non-2xx status codes
- Required parameters are missing

Error messages include the HTTP status code and status text for debugging.

## Rate Limiting

The Twist API has rate limits. Currently, the client doesn't implement automatic retry logic.
Future enhancements should add:

- Exponential backoff for rate limit errors
- Respect for rate limit headers
- Request queuing to avoid hitting limits
