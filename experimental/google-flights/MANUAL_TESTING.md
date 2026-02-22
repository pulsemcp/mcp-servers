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

### 2026-02-22 - v0.1.2 Manual Testing

**Commit:** 2494476
**Result:** 15/15 tests passed (100%)

```
 ✓ tests/manual/google-flights.manual.test.ts (15 tests) 23456ms
   ✓ Google Flights Manual Tests > search_flights > should search domestic one-way flights (SFO -> LAX)
   ✓ Google Flights Manual Tests > search_flights > should search international round-trip flights (JFK -> LHR)
   ✓ Google Flights Manual Tests > search_flights > should search business class flights (LAX -> JFK)
   ✓ Google Flights Manual Tests > search_flights > should filter nonstop flights only
   ✓ Google Flights Manual Tests > search_flights > should support pagination
   ✓ Google Flights Manual Tests > search_flights > should sort by price
   ✓ Google Flights Manual Tests > search_flights > should search transpacific flights (SFO -> NRT)
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for domestic route
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for international route
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by city name
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by airport name
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by IATA code
   ✓ Google Flights Manual Tests > find_airport_code > should find airports for Tokyo

 Test Files  1 passed (1)
      Tests  15 passed (15)
```

**Key functionality verified:**

- **search_flights**: Domestic one-way (SFO→LAX), international round-trip (JFK→LHR), business class (LAX→JFK), nonstop filtering, pagination, price sorting, transpacific (SFO→NRT)
- **fare_brand**: Validated on all search_flights results — fare_brand is string or null, values are one of "Economy", "Economy+", "Economy Flex"
- **extensions**: Validated on all search_flights results — carry_on_included (boolean), checked_bags_included (number >= 0)
- **get_date_grid**: Domestic route, international route
- **find_airport_code**: City name lookup, airport name, IATA code, multi-airport city
- **tool listing**: All 3 tools registered correctly
