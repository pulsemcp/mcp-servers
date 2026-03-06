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

### 2026-03-06 - v0.2.0 Manual Testing

**Commit:** 4660b0b
**Result:** 17/17 tests passed (100%)

```
 ✓ tests/manual/google-flights.manual.test.ts (17 tests) 25629ms
   ✓ Google Flights Manual Tests > search_flights > should search domestic one-way flights (SFO -> LAX)  2067ms
   ✓ Google Flights Manual Tests > search_flights > should search international round-trip flights (JFK -> LHR)  1698ms
   ✓ Google Flights Manual Tests > search_flights > should search business class flights (LAX -> JFK)  1688ms
   ✓ Google Flights Manual Tests > search_flights > should filter nonstop flights only  1176ms
   ✓ Google Flights Manual Tests > search_flights > should support pagination  3233ms
   ✓ Google Flights Manual Tests > search_flights > should sort by price  1849ms
   ✓ Google Flights Manual Tests > search_flights > should exclude basic economy fares by default  1047ms
   ✓ Google Flights Manual Tests > search_flights > should include basic economy fares when exclude_basic_economy is false  1759ms
   ✓ Google Flights Manual Tests > search_flights > should return error for round_trip without return_date
   ✓ Google Flights Manual Tests > search_flights > should search transpacific flights (SFO -> NRT)  1370ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for domestic route  1495ms
   ✓ Google Flights Manual Tests > get_date_grid > should get date grid for international route  2947ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by city name  345ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by airport name  1467ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports by IATA code  1621ms
   ✓ Google Flights Manual Tests > find_airport_code > should find airports for Tokyo  1406ms
   ✓ Google Flights Manual Tests > tool listing > should list all 3 tools

 Test Files  1 passed (1)
      Tests  17 passed (17)
```

**Key functionality verified:**

- **search_flights**: Domestic one-way (SFO→LAX), international round-trip (JFK→LHR), business class (LAX→JFK), nonstop filtering, pagination, price sorting, transpacific (SFO→NRT)
- **exclude_basic_economy**: Default search (exclude_basic_economy=true) returned 65 flights with fare brands {"Economy Flex":18,"Economy+":2} — no basic economy fares. With exclude_basic_economy=false, returned 87 flights with {"Economy":20,"Economy Flex":28,"Economy+":2} — 20 basic economy fares included
- **fare_brand**: Validated on all search_flights results — fare_brand is string or null, values are one of "Economy", "Economy+", "Economy Flex"
- **extensions**: Validated on all search_flights results — carry_on_included (boolean), checked_bags_included (number >= 0)
- **get_date_grid**: Domestic route, international route
- **find_airport_code**: City name lookup, airport name, IATA code, multi-airport city
- **tool listing**: All 3 tools registered correctly
