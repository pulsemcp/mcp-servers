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
│   │   ├── tools.ts           # Tool registration with grouping
│   │   ├── tools/             # Individual tool implementations
│   │   │   ├── list-sessions.ts
│   │   │   ├── get-session.ts
│   │   │   ├── create-session.ts
│   │   │   ├── search-sessions.ts
│   │   │   ├── session-actions.ts
│   │   │   ├── logs.ts
│   │   │   └── subagent-transcripts.ts
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

- `ENABLED_TOOLGROUPS` - Comma-separated list of tool groups (readonly, write, admin)
- `SKIP_HEALTH_CHECKS` - Skip API validation at startup

## Tool Groups

- **readonly**: list_sessions, get_session, search_sessions, list_logs, list_subagent_transcripts, get_subagent_transcript
- **write**: create_session, update_session, follow_up, pause_session, restart_session, archive_session, unarchive_session, create_log
- **admin**: delete_session

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
