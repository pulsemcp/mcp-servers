# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Initial implementation of SerpAPI Hotels MCP server
- `search_hotels` tool for searching hotels with Google Hotels via SerpAPI
  - Support for price, rating, star class, and amenity filters
  - Sorting by price, rating, or number of reviews
  - Pagination via next_page_token
  - Currency and localization options
  - Vacation rental search mode
- `get_hotel_details` tool for detailed hotel information
  - Prices from multiple booking sources
  - Review sentiment breakdown by category
  - Full amenity lists and nearby places
- `get_hotel_reviews` tool for individual guest reviews
  - Full review text snippets with ratings and sub-ratings
  - Sorting by most helpful, most recent, highest/lowest score
  - Filtering by review category or source
  - Hotel management responses
  - Pagination support
- Server configuration resource at `serpapi-hotels://config`
- Functional tests with mocked SerpAPI client
- Integration tests using TestMCPClient
- Manual tests for real API validation
- Date validation: check_out_date must be after check_in_date, invalid dates rejected
- 30-second request timeout on SerpAPI HTTP calls
