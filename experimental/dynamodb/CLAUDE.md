# CLAUDE.md

This file provides guidance for Claude Code when working with the DynamoDB MCP server.

## Overview

This is an MCP server for AWS DynamoDB that provides comprehensive table and item operations with fine-grained tool access control.

## Key Features

- **Complete DynamoDB Operations**: Tables, items, queries, scans, and batch operations
- **Fine-grained Access Control**: Enable/disable tools by group or individually
- **AWS Credential Support**: Works with explicit credentials or AWS credential chain
- **Custom Endpoints**: Support for local DynamoDB or LocalStack

## Directory Structure

```
dynamodb/
├── local/                      # Local server implementation
│   ├── src/
│   │   ├── index.ts           # Main entry point with env validation
│   │   └── index.integration-with-mock.ts # Integration test entry
│   └── package.json
├── shared/                     # Shared business logic
│   ├── src/
│   │   ├── server.ts          # Server factory
│   │   ├── tools.ts           # Tool registration with filtering
│   │   ├── tools/             # Individual tool implementations
│   │   ├── dynamodb-client/   # AWS DynamoDB client
│   │   ├── resources.ts       # Resource implementations
│   │   └── types.ts           # Shared types
│   └── package.json
├── tests/
│   ├── functional/            # Unit tests
│   ├── integration/           # MCP protocol tests
│   ├── manual/                # Real AWS tests
│   └── mocks/                 # Mock implementations
└── package.json               # Root workspace config
```

## Tool Groups

The server organizes tools into three groups for access control:

- **readonly**: `list_tables`, `describe_table`, `get_item`, `query`, `scan`, `batch_get_items`
- **readwrite**: `put_item`, `update_item`, `delete_item`, `batch_write_items`
- **admin**: `create_table`, `delete_table`, `update_table`

## Environment Variables

### Required

- `AWS_REGION` (or `AWS_DEFAULT_REGION`): AWS region

### Optional

- `AWS_ACCESS_KEY_ID`: AWS credentials (uses credential chain if not set)
- `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `DYNAMODB_ENDPOINT`: Custom endpoint (for local DynamoDB)
- `DYNAMODB_ENABLED_TOOL_GROUPS`: Comma-separated groups to enable
- `DYNAMODB_ENABLED_TOOLS`: Whitelist specific tools
- `DYNAMODB_DISABLED_TOOLS`: Blacklist specific tools

## Development Commands

```bash
npm run install-all    # Install dependencies
npm run build          # Build the project
npm run dev            # Development mode
npm run test:run       # Run functional tests
npm run test:integration # Run integration tests
npm run test:manual    # Run manual tests (requires AWS credentials)
npm run lint           # Check code quality
npm run format         # Format code
```

## Adding New Tools

1. Create tool file in `shared/src/tools/`
2. Follow the factory pattern with Zod validation
3. Register in `shared/src/tools.ts` with appropriate groups
4. Add tests in `tests/functional/`

## Changelog

Always update CHANGELOG.md when making changes.

## Logging

Use the logging functions from `shared/src/logging.ts` instead of console.log.
