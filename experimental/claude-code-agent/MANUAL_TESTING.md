# Manual Testing Guide

## Overview

Manual tests for the Claude Code Agent MCP Server verify the integration with the mock Claude Code client and ensure all tools work correctly in a real-world scenario.

## Latest Test Results

**Commit:** b00eb63
**Date:** 2025-10-13

**Overall:** 100% passing (3/3 test suites)

### Major Changes Tested in v0.0.5

This comprehensive test run verified all major architectural improvements including:

- **New diagnose_agent tool**: Added as the 8th tool (updated from 7 to 8 tools)
- **Modular server installation architecture**: Complete refactoring with server-installer modules
- **Enhanced secrets management**: KEY=VALUE format support with backward compatibility
- **Complex server support**: Local registries, custom runtime paths, complex arguments
- **State persistence**: MCP server working directory persistence via PROJECT_WORKING_DIRECTORY
- **Improved error handling**: Hard failure on missing required secrets with clear messages
- **Inference system**: Claude-powered configuration decisions for server selection
- **Schema flexibility**: Support for both 'default' and 'value' fields in server configurations

### Test Suite Results

- ✅ Mock Workflow: 1/1 passed (with integration mock client)
- ✅ Tool Workflow: 1/1 passed (real Claude Code CLI tested - 33.2s duration)
- ✅ Error Scenarios: 1/1 passed (proper error handling verified)

## Prerequisites

Before running manual tests:

1. **Build everything**:

   ```bash
   npm run build:test
   ```

2. **Ensure you have a valid servers.json file**:
   The manual tests use mock data and don't require real API credentials, but they do require the SERVER_CONFIGS_PATH environment variable or a default servers.json file.

## Running Manual Tests

### First-time setup (required for new worktrees)

```bash
npm run test:manual:setup
```

This setup script will:

- Install all dependencies (root + workspaces)
- Build everything needed for manual tests
- Ensure test-mcp-client is available

### Run all manual tests

```bash
npm run test:manual
```

### Run specific test

```bash
npm run test:manual -- tests/manual/claude-code-agent.manual.test.ts
```

## Test Scenarios

### 1. Full Agent Workflow Test

Tests the complete lifecycle:

- Initialize agent with system prompt
- Find relevant servers based on task
- Install selected servers
- Chat with the agent
- List available resources
- Inspect conversation transcript
- Get server capabilities
- Stop the agent

### 2. Error Handling Test

Verifies error scenarios:

- Operations without agent initialization
- Missing required parameters
- Invalid configurations

## Expected Results

### SUCCESS

- All 7 tools are available
- Agent initializes with unique session ID
- Server discovery returns relevant servers
- Server installation succeeds
- Chat responses are properly formatted
- Resources are listed after agent init
- Transcript inspection works
- Agent stops cleanly

### WARNING

Some features may show warnings if:

- Mock data doesn't perfectly match expected formats
- Simulated delays cause timing issues

### FAILURE

Tests fail if:

- Tools are missing or incorrectly registered
- Agent state is not properly managed
- Error handling doesn't return proper error responses
- Resources are not created/tracked correctly

## Manual Test Results

**Last tested**: 2025-10-13
**Commit**: b00eb63
**Result**: SUCCESS (100% pass rate)
**Note**: Comprehensive testing of v0.0.5 architectural improvements including server installation refactoring

### Test Execution Details

- [x] Mock workflow test - PASSED (with new diagnose_agent tool)
- [x] Tool workflow test (real Claude Code CLI) - PASSED (33.2s duration)
- [x] Error handling test - PASSED (proper validation and error responses)
- [x] All 8 tools verified and working (added diagnose_agent tool)
- [x] Server installation architecture fully tested
- [x] Enhanced secrets management verified (KEY=VALUE format support)
- [x] Complex server configurations working (local registry, custom paths)
- [x] State persistence verified (PROJECT_WORKING_DIRECTORY)
- [x] Inference system tested (Claude-powered server selection)
- [x] Real Claude Code CLI integration verified with new architecture

### Test Statistics

- Test Files: 1 passed
- Tests: 3 passed | 0 skipped
- Duration: 33.65s
- Real Claude CLI chat response: 386 tokens, 14.3s duration

### Notes

- Mock tests validate all tool functionality with new modular architecture
- Real Claude CLI integration fully tested with server installation refactoring
- Enhanced secrets management working with both JSON and KEY=VALUE formats
- Server installation inference system successfully tested with real Claude integration
- State persistence correctly implemented in MCP server working directory
- Complex server support verified (postgres with database credentials handling)
- All 8 tools working correctly including new diagnose_agent tool
- Installation warnings properly handled for missing credentials
- Error scenarios correctly validate missing parameters and invalid server configurations
