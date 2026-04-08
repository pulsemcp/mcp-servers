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

### 2026-03-07 - v0.2.1 Manual Testing

**Commit:** 14b6516
**Result:** 18/18 tests passed (100%)

```
 ✓ tests/manual/google-flights.manual.test.ts (18 tests) 30121ms
   ✓ Google Flights Manual Tests > search_flights > should search domestic one-way flights (SFO -> LAX)  2255ms
   ✓ Google Flights Manual Tests > search_flights > should search international round-trip flights (JFK -> LHR)  1724ms
   ✓ Google Flights Manual Tests > search_flights > should search business class flights (LAX -> JFK)  2009ms
   ✓ Google Flights Manual Tests > search_flights > should filter nonstop flights only  1799ms
   ✓ Google Flights Manual Tests > search_flights > should support pagination  4058ms
   ✓ Google Flights Manual Tests > search_flights > should sort by price  1299ms
   ✓ Google Flights Manual Tests > search_flights > should exclude basic economy fares by default  1891ms
   ✓ Google Flights Manual Tests > search_flights > should include basic economy fares when exclude_basic_economy is false  1933ms
   ✓ Google Flights Manual Tests > search_flights > should include best flights (featured by Google) in results  2764ms
   ✓ Google Flights Manual Tests > search_flights > should return error for round_trip without return_date
   ✓ Google Flights Manual Tests > search_flights > should search transpacific flights (SFO -> NRT)  1772ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for domestic route  1742ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for international route  1634ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by city name  310ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by airport name  1454ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by IATA code  1461ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports for Tokyo  1522ms
   ✓ Google Flights Manual Tests > tool listing > should list all 3 tools

 Test Files  1 passed (1)
      Tests  18 passed (18)
```

**Key functionality verified:**

- **search_flights**: Domestic one-way (SFO→LAX), international round-trip (JFK→LHR), business class (LAX→JFK), nonstop filtering, pagination, price sorting, transpacific (SFO→NRT)
- **best flights inclusion**: SFO→ATL one-way returned 180 total flights with 50 marked as best (from Google's featured section), confirming the fix merges both data sections
- **exclude_basic_economy**: Default search (exclude_basic_economy=true) returned 127 flights with fare brands {"Economy Flex":19,"Economy+":1} — no basic economy fares. With exclude_basic_economy=false, returned 152 flights with {"Economy":10,"Economy Flex":39,"Economy+":1} — basic economy fares included
- **get_date_grid**: Domestic route, international route
- **find_airport_code**: City name lookup, airport name, IATA code, multi-airport city
- **tool listing**: All 3 tools registered correctly
