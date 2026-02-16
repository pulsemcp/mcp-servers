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
- Server configuration resource at `serpapi-hotels://config`
- Functional tests with mocked SerpAPI client
- Integration tests using TestMCPClient
- Manual tests for real API validation
- Date validation: check_out_date must be after check_in_date
