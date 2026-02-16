# Manual Testing Results

This file tracks the **most recent** manual test results for the Google Flights MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Test Execution

### Prerequisites

1. **Commit your changes BEFORE running tests** - The test results reference the current commit hash.

   ```bash
   git add .
   git commit -m "Your changes"
   ```

2. No `.env` file or API keys needed - this server uses public Google Flights endpoints.

### First-Time Setup (or after clean checkout)

```bash
npm run test:manual:setup
```

### Running Tests

```bash
npm run test:manual
```

## Test Results

### 2026-02-16 - v0.1.1 Manual Testing

**Commit:** PLACEHOLDER
**Result:** 15/15 tests passed (100%)

```
 ✓ tests/manual/google-flights.manual.test.ts (15 tests) 20982ms
   ✓ Google Flights Manual Tests > search_flights > should search domestic one-way flights (SFO -> LAX)  2080ms
   ✓ Google Flights Manual Tests > search_flights > should search international round-trip flights (JFK -> LHR)  1551ms
   ✓ Google Flights Manual Tests > search_flights > should search business class flights (LAX -> JFK)  1401ms
   ✓ Google Flights Manual Tests > search_flights > should filter nonstop flights only  1488ms
   ✓ Google Flights Manual Tests > search_flights > should support pagination  2944ms
   ✓ Google Flights Manual Tests > search_flights > should sort by price  1572ms
   ✓ Google Flights Manual Tests > search_flights > should search transpacific flights (SFO -> NRT)  1291ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for domestic route  1294ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for international route  1790ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by city name  631ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by airport name  2173ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by IATA code  771ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports for Tokyo  1585ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  22:55:54
   Duration  21.73s (transform 97ms, setup 18ms, collect 301ms, tests 20.98s, environment 0ms, prepare 81ms)
```

**Key functionality verified:**

- **search_flights**: Domestic one-way (SFO→LAX, 88 flights, cheapest $49), international round-trip (JFK→LHR, 72 flights), business class (LAX→JFK, 136 flights), nonstop filtering (all 10 results nonstop), pagination (two pages of 5), price sorting ($124-$165 ascending), validation errors (missing return_date), transpacific (SFO→NRT, 51 flights with connections)
- **get_date_grid**: Domestic route (61 dates, cheapest $28), international route (61 dates, cheapest $234)
- **find_airport_code**: City name lookup ("San Francisco" → SFO), airport name ("Heathrow" → LHR), IATA code (LAX → Los Angeles International Airport), multi-airport city ("Tokyo" → HND, NRT)
- **tool listing**: All 3 tools registered correctly
