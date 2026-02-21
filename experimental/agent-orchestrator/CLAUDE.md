# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the agent-orchestrator MCP server.

## Overview

This is an MCP server for PulseMCP's agent-orchestrator: a Claude Code + MCP-powered agent-parallelization system for agentic coding and ops. It provides tools for managing agent sessions, logs, and subagent transcripts via the Agent Orchestrator REST API.

## Architecture

The server follows a monorepo structure with local/shared separation:

```
agent-orchestrator/
├── local/                      # Local server implementation
│   ├── src/
│   │   ├── index.ts           # Main entry point with env validation
│   │   └── index.integration-with-mock.ts # Integration test entry
│   └── package.json
├── shared/                     # Shared business logic
│   ├── src/
│   │   ├── server.ts          # Server factory with DI
│   │   ├── tools.ts           # Tool registration
│   │   ├── tools/             # Individual tool implementations (13 tools)
│   │   │   ├── search-sessions.ts        # List/search/filter sessions
│   │   │   ├── get-session.ts            # Get session details with logs/transcripts
│   │   │   ├── get-configs.ts            # Fetch all static configuration
│   │   │   ├── start-session.ts          # Create and start new sessions
│   │   │   ├── action-session.ts         # Session actions (12 actions)
│   │   │   ├── manage-enqueued-messages.ts # Session message queue management
│   │   │   ├── send-push-notification.ts # Send push notifications
│   │   │   ├── get-notifications.ts      # Get/list notifications and badge
│   │   │   ├── action-notification.ts    # Mark read, dismiss notifications
│   │   │   ├── search-triggers.ts        # Search/list triggers
│   │   │   ├── action-trigger.ts         # Create, update, delete, toggle triggers
│   │   │   ├── get-system-health.ts      # System health and CLI status
│   │   │   └── action-health.ts          # Maintenance actions
│   │   ├── orchestrator-client/  # REST API client
│   │   │   ├── orchestrator-client.ts
│   │   │   └── orchestrator-client.integration-mock.ts
│   │   ├── resources.ts       # Resource implementations
│   │   ├── types.ts           # API types
│   │   └── logging.ts         # Centralized logging
│   └── package.json
├── tests/                      # Test suite
│   ├── functional/            # Unit tests with mocks
│   ├── integration/           # MCP protocol tests
│   └── mocks/                 # Mock implementations
└── package.json               # Root workspace config
```

## Environment Variables

Required:

- `AGENT_ORCHESTRATOR_BASE_URL` - Base URL for the API (e.g., `http://localhost:3000`)
- `AGENT_ORCHESTRATOR_API_KEY` - API key for authentication

Optional:

- `TOOL_GROUPS` - Comma-separated list of tool groups (sessions, sessions_readonly, notifications, notifications_readonly, triggers, triggers_readonly, health, health_readonly)
- `SKIP_HEALTH_CHECKS` - Skip API validation at startup

## Tools

The server provides 13 tools across 4 domains:

- **search_sessions** - List, filter, and search sessions (supports status filter, query search, pagination)
- **get_session** - Get detailed session info with optional logs, transcripts, and transcript format
- **get_configs** - Fetch all static configuration (MCP servers, agent roots, stop conditions)
- **start_session** - Create and optionally start a new agent session
- **action_session** - Perform actions on sessions (follow_up, pause, restart, archive, unarchive, change_mcp_servers, fork, refresh, refresh_all, update_notes, toggle_favorite, bulk_archive)
- **manage_enqueued_messages** - Manage session message queue (list, get, create, update, delete, reorder, interrupt)
- **send_push_notification** - Send push notifications to users about sessions needing attention
- **get_notifications** - Get/list notifications and badge count
- **action_notification** - Mark read, dismiss notifications
- **search_triggers** - Search/list automation triggers
- **action_trigger** - Create, update, delete, toggle triggers
- **get_system_health** - Get system health report and CLI status
- **action_health** - System maintenance actions

## Development

### Build and Test

```bash
npm run install-all
npm run build
npm test
npm run test:integration
```

### Adding New Tools

1. Create tool file in `shared/src/tools/`
2. Follow the existing pattern with Zod validation
3. Register in `shared/src/tools.ts`
4. Add tests in `tests/functional/` and `tests/integration/`

## Logging

Always use the logging functions from `shared/src/logging.ts` instead of `console.log` to maintain MCP protocol compliance.
