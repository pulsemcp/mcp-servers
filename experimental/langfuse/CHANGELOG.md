# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Manual tests against real Langfuse API
