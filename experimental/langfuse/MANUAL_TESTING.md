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

- **Commit:** 788fd225ad59d26b027d616737a6df97dfe0488f
- **Date:** 2026-02-10
- **Result:** 6/6 tests passed (100%)

### Test Details

| Test                                             | Result | Notes                                                    |
| ------------------------------------------------ | ------ | -------------------------------------------------------- |
| GET /api/public/traces - list traces             | PASS   | Listed 1 trace after seeding                             |
| GET /api/public/traces - filter by name          | PASS   | Filtered traces by name "seed-trace"                     |
| GET /api/public/traces/{traceId} - detail        | PASS   | Retrieved full trace detail with observations and scores |
| GET /api/public/observations - list              | PASS   | Listed 2 observations (SPAN + GENERATION)                |
| GET /api/public/observations - filter by traceId | PASS   | Filtered observations by traceId                         |
| GET /api/public/observations/{id} - detail       | PASS   | Retrieved full observation detail with model info        |

### Key Functionality Verified

- Authentication via Basic Auth (publicKey:secretKey)
- Trace listing with pagination metadata (page, limit, totalItems, totalPages)
- Trace filtering by name
- Trace detail retrieval with nested observations and scores arrays
- Observation listing with type and model info
- Observation filtering by traceId
- Individual observation detail with latency, type, and model
