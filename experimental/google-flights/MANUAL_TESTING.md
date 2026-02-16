# Manual Testing Results

This file tracks manual testing results for the Google Flights MCP Server.

## Latest Test Run

**Date:** 2026-02-16
**Commit:** c8eef5ca481ffbe833eae6c7ad72b7749654e838
**Tester:** Claude Code

### Test Results

| Test                                                | Result  | Notes                                            |
| --------------------------------------------------- | ------- | ------------------------------------------------ |
| search_flights - domestic one-way (SFO→LAX)         | ✅ PASS | Found 97 flights, cheapest $41 on United         |
| search_flights - international round-trip (JFK→LHR) | ✅ PASS | Found 77 flights across 3 airlines               |
| search_flights - business class (LAX→JFK)           | ✅ PASS | Found 137 business class flights, from $100      |
| search_flights - nonstop filter                     | ✅ PASS | All 10 flights are nonstop                       |
| search_flights - pagination                         | ✅ PASS | Page 1: 5, Page 2: 5, Total: 97                  |
| search_flights - sort by price                      | ✅ PASS | 15 flights sorted $119-$165                      |
| search_flights - validation error                   | ✅ PASS | Correctly returned error for missing return_date |
| search_flights - transpacific (SFO→NRT)             | ✅ PASS | Found 61 flights with connections                |
| get_date_grid - domestic route                      | ✅ PASS | 61 dates, cheapest $28 on 2026-01-22             |
| get_date_grid - international route                 | ✅ PASS | 61 dates, cheapest $234 on 2025-12-17            |
| find_airport_code - by city name                    | ✅ PASS | Found SFO for "San Francisco"                    |
| find_airport_code - by airport name                 | ✅ PASS | Found LHR for "Heathrow"                         |
| find_airport_code - by IATA code                    | ✅ PASS | Found LAX with full name                         |
| find_airport_code - Tokyo (multiple airports)       | ✅ PASS | Found HND and NRT                                |
| tool listing                                        | ✅ PASS | All 3 tools listed                               |

**15/15 tests passed (100%)**
**Duration: 21.86s**
