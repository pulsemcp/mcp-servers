# Google Calendar MCP Server - Claude Code Guide

This file provides context for Claude Code when working with the Google Calendar MCP server.

## Overview

This is an experimental MCP server that provides Google Calendar integration using service account authentication with domain-wide delegation. It follows the same patterns as the Gmail MCP server in this repository.

## Architecture

### Directory Structure

```
experimental/google-calendar/
├── local/           # CLI entry point and packaging
│   ├── src/
│   │   ├── index.ts                          # Production entry
│   │   └── index.integration-with-mock.ts    # Integration test entry
│   ├── package.json
│   ├── setup-dev.js
│   └── prepare-publish.js
├── shared/          # Core business logic
│   ├── src/
│   │   ├── server.ts                         # MCP server factory, auth client
│   │   ├── tools.ts                          # Tool registration
│   │   ├── types.ts                          # Google Calendar API types
│   │   ├── logging.ts                        # Stderr logging utilities
│   │   ├── tools/                            # Individual tool implementations
│   │   ├── calendar-client/lib/              # API wrappers
│   │   └── utils/                            # Helper utilities
│   └── package.json
└── tests/           # Test suites
    ├── functional/  # Unit tests with mocks
    ├── integration/ # MCP protocol tests
    ├── manual/      # Real API tests
    └── mocks/       # Mock implementations
```

### Authentication Pattern

Uses Google Service Account with domain-wide delegation (same pattern as Gmail):

- Service account credentials from environment variables
- JWT token generation with token caching (60s buffer)
- Mutex pattern for token refresh to prevent race conditions
- Impersonates a specific user via the `subject` field in JWT

**Environment Variables:**

- `GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL`
- `GCAL_SERVICE_ACCOUNT_PRIVATE_KEY`
- `GCAL_IMPERSONATE_EMAIL`

### Tools Implemented

1. **gcal_list_events**: List events with time range filtering and search
2. **gcal_get_event**: Get detailed event information
3. **gcal_create_event**: Create new events with attendees
4. **gcal_list_calendars**: Discover available calendars
5. **gcal_query_freebusy**: Check availability and busy periods

All tools follow MCP best practices with:

- Zod schema validation for inputs
- Clear, descriptive parameter documentation
- Markdown-formatted output for readability
- Structured error handling with user-friendly messages

### API Integration

Calendar API client methods are dynamically imported and use:

- Base URL: `https://www.googleapis.com/calendar/v3`
- Scope: `https://www.googleapis.com/auth/calendar`
- Error handling for common HTTP status codes (401, 403, 404, 429)

## Development Guidelines

### Testing

- **Functional tests**: Mock client, test tool logic
- **Integration tests**: TestMCPClient, test MCP protocol
- **Manual tests**: Real API, requires service account credentials in `.env`

Run tests:

```bash
npm test                    # Functional tests
npm run test:integration    # Integration tests
npm run test:manual         # Manual tests (requires .env)
```

### Common Tasks

**Adding a new tool:**

1. Create tool file in `shared/src/tools/`
2. Define Zod schema for parameters
3. Implement tool factory function
4. Add to `ALL_TOOLS` array in `tools.ts`
5. Add API client method if needed
6. Write tests in `tests/functional/` and update integration tests

**Modifying API client:**

1. Update interface in `server.ts`
2. Update implementation in `ServiceAccountCalendarClient`
3. Add/modify API wrapper in `calendar-client/lib/`
4. Update mocks in `tests/mocks/`

### Logging

All logging uses `console.error()` (stderr) to comply with MCP protocol requirement that stdout contains only JSON messages.

### Publishing

This server uses the monorepo publishing workflow:

- Version bumps: `npm run stage-publish` in `local/`
- CI/CD handles npm publishing automatically on merge to main
- Manual tests should be run before staging a version bump

## API Reference

### Google Calendar API v3

Endpoints used:

- `GET /calendars/{calendarId}/events` - List events
- `GET /calendars/{calendarId}/events/{eventId}` - Get event
- `POST /calendars/{calendarId}/events` - Create event
- `GET /users/me/calendarList` - List calendars
- `POST /freeBusy` - Query availability

## Known Limitations

- **Create-only**: Currently doesn't support updating or deleting events
- **No recurring event editing**: Recurring events are shown as instances but can't be edited as a series
- **Basic reminders**: Limited reminder configuration support
- **No attachment support**: Can't upload or retrieve event attachments

## Future Enhancements

Consider adding:

- Update and delete event tools
- Batch operations for efficiency
- Calendar creation and management
- Event color customization
- Attachment handling
- Extended recurrence rule support
