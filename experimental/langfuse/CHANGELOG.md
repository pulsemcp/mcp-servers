# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.1.2] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.1.1] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

## [0.1.0]

### Added

- Initial Langfuse MCP server with readonly trace and observation analysis tools
- `get_traces` tool — list traces with filtering by name, userId, sessionId, tags, timestamps, environment, and more
- `get_trace_detail` tool — get full trace detail including nested observations and scores
- `get_observations` tool — list observations with filtering by traceId, type, level, model, timestamps, and more
- `get_observation` tool — get full observation detail including input, output, metadata, and model parameters
- Automatic truncation of large field values (>1000 chars) to /tmp files with inline references for grep-based exploration
- Configuration resource at `langfuse://config` for debugging setup
- Functional tests for all tools and truncation utility
- Integration tests using TestMCPClient with mocked Langfuse API
- Manual tests via TestMCPClient against real Langfuse API, including end-to-end truncation verification
- Graceful error handling for /tmp file write failures during truncation
