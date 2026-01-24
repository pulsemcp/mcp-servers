# Manual Testing

This file tracks manual testing results for the pulse-directory MCP server.

## Latest Test Results

**Commit:** Not yet tested with real API

**Note:** This server is new and has not been tested with a real PulseMCP API key. The integration tests verify functionality with mocked responses. Before the first publication, manual testing with real API credentials should be performed.

## Test Requirements

To run manual tests, you will need:

1. A valid PulseMCP API key
2. Set the `PULSEMCP_API_KEY` environment variable

## Test Plan

When performing manual testing, verify:

1. **list_servers tool**
   - [ ] Returns list of servers from the directory
   - [ ] Search filtering works correctly
   - [ ] Pagination works with cursor
   - [ ] Rate limiting is handled gracefully

2. **get_server tool**
   - [ ] Returns server details for a known server
   - [ ] "latest" version works as default
   - [ ] Specific version retrieval works
   - [ ] Server not found error is handled correctly
