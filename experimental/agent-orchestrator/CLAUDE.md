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
│   │   ├── tools/             # Individual tool implementations (6 tools)
│   │   │   ├── search-sessions.ts  # List/search/filter sessions
│   │   │   ├── get-session.ts      # Get session details with logs/transcripts
│   │   │   ├── get-configs.ts      # Fetch all static configuration
│   │   │   ├── start-session.ts    # Create and start new sessions
│   │   │   ├── action-session.ts   # Session actions (follow_up, pause, restart, archive, unarchive)
│   │   │   └── send-push-notification.ts # Send push notifications about sessions
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

- `TOOL_GROUPS` - Comma-separated list of tool groups (sessions, sessions_readonly, notifications, notifications_readonly)
- `SKIP_HEALTH_CHECKS` - Skip API validation at startup

## Tools

The server provides 6 tools with a simplified, consolidated API:

- **search_sessions** - List, filter, and search sessions (supports status filter, query search, pagination)
- **get_session** - Get detailed session info with optional logs and subagent transcripts
- **get_configs** - Fetch all static configuration (MCP servers, agent roots, stop conditions)
- **start_session** - Create and optionally start a new agent session
- **action_session** - Perform actions on sessions (follow_up, pause, restart, archive, unarchive, change_mcp_servers)
- **send_push_notification** - Send push notifications to users about sessions needing attention

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
