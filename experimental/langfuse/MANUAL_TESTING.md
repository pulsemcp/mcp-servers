# Manual Testing Results

This file tracks the **most recent** manual test results for the Langfuse MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests**
2. **Set up API credentials** in your `.env` file:

   ```bash
   cp .env.example .env
   # Edit .env with your Langfuse credentials
   ```

3. **Seed truncation test data**: Ingest a trace with >1000 character input/output fields named `seed-truncation-trace` so the truncation tests have data to work with.

### First-Time Setup

```bash
npm run test:manual:setup
```

### Running Tests

```bash
npm run test:manual
```

---

## Latest Test Results

**Test Date:** 2026-02-10
**Commit:** 194ab09
**Tested By:** Claude
**Overall:** 8/8 tests passed, 100%

### Test Details

| Test                                                       | Result | Notes                                                          |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| get_traces - list traces with default params               | PASS   | Listed 2 traces, verified data/meta structure                  |
| get_traces - filter by name                                | PASS   | Filtered traces by name "seed-trace"                           |
| get_trace_detail - get detail for a known trace            | PASS   | Retrieved full trace with observations and scores arrays       |
| get_observations - list observations                       | PASS   | Listed 3 observations with metadata                            |
| get_observations - filter by traceId                       | PASS   | Filtered observations by traceId                               |
| get_observation - get observation detail                   | PASS   | Retrieved observation with type, model, startTime              |
| truncation - trace detail large fields saved to /tmp       | PASS   | Input/output fields truncated, /tmp files created (1560 chars) |
| truncation - observation detail large fields saved to /tmp | PASS   | Input field truncated, /tmp file created with full content     |

### Key Functionality Verified

- Full MCP protocol pipeline via TestMCPClient (not just raw API calls)
- Authentication via Basic Auth (publicKey:secretKey)
- Trace listing with pagination metadata (page, limit, totalItems, totalPages)
- Trace filtering by name
- Trace detail retrieval with nested observations and scores arrays
- Observation listing with type and model info
- Observation filtering by traceId
- Individual observation detail with latency, type, and model
- **Truncation of large fields (>1000 chars) to /tmp files with grep references**
- **Verification that /tmp files exist and contain full content**
