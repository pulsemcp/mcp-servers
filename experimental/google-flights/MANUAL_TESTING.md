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

### 2026-02-16 - v0.1.0 Manual Testing

**Commit:** f7a7e3c
**Result:** 15/15 tests passed (100%)

```
 ✓ tests/manual/google-flights.manual.test.ts (15 tests) 22467ms
   ✓ Google Flights Manual Tests > search_flights > should search domestic one-way flights (SFO -> LAX)  2111ms
   ✓ Google Flights Manual Tests > search_flights > should search international round-trip flights (JFK -> LHR)  1649ms
   ✓ Google Flights Manual Tests > search_flights > should search business class flights (LAX -> JFK)  1652ms
   ✓ Google Flights Manual Tests > search_flights > should filter nonstop flights only  1624ms
   ✓ Google Flights Manual Tests > search_flights > should support pagination  2773ms
   ✓ Google Flights Manual Tests > search_flights > should sort by price  1987ms
   ✓ Google Flights Manual Tests > search_flights > should search transpacific flights (SFO -> NRT)  1363ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for domestic route  2082ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for international route  1803ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by city name  316ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by airport name  1782ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by IATA code  1218ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports for Tokyo  1659ms

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Start at  02:04:18
   Duration  23.10s (transform 135ms, setup 20ms, collect 209ms, tests 22.47s, environment 0ms, prepare 87ms)
```

**Key functionality verified:**

- **search_flights**: Domestic one-way (SFO→LAX, 97 flights, cheapest $41), international round-trip (JFK→LHR, 77 flights), business class (LAX→JFK, 139 flights), nonstop filtering (all 10 results nonstop), pagination (two pages of 5), price sorting ($119-$165 ascending), validation errors (missing return_date), transpacific (SFO→NRT, 59 flights with connections)
- **get_date_grid**: Domestic route (61 dates, cheapest $28), international route (61 dates, cheapest $234)
- **find_airport_code**: City name lookup ("San Francisco" → SFO), airport name ("Heathrow" → LHR), IATA code (LAX → Los Angeles International Airport), multi-airport city ("Tokyo" → HND, NRT)
- **tool listing**: All 3 tools registered correctly
