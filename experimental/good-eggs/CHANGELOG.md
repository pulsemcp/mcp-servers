# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2026-01-15

### Added

- Added `quantity` field to `get_past_order_groceries` output showing the quantity/unit ordered (e.g., "1 bunch", "1 lb", "15 oz")
- Improved price extraction for past order groceries using the `split-price` elements for more accurate price formatting (e.g., "$2.99" instead of raw text)

### Fixed

- Fixed product name extraction for past order groceries to use specific `.product-tile__product-name` selector, avoiding concatenation of brand and discount text into the name
- Fixed brand extraction to use `.product-tile__producer-name` selector for more accurate results
- Fixed container selection for past order product tiles to use `.product-tile` class for reliable extraction of all product data

## [0.1.3] - 2026-01-13

### Fixed

- Fixed `get_list_of_past_order_dates` to correctly identify order date headers on the Good Eggs reorder page using the `.reorder-page__grid__header` CSS selector
- Fixed `get_past_order_groceries` to correctly extract products from a specific order date section instead of trying to click on non-clickable date headers
- Filtered out non-order sections (like "Based on your shopping" recommendations) from past order dates

## [0.1.2] - 2026-01-13

### Added

- Background login initialization: Playwright login now starts immediately when the MCP server connection is established, without blocking the stdio connection
- If background login fails, the server shuts down with an appropriate error message
- All tool calls now wait for the background login to complete before executing

## [0.1.1] - 2026-01-12

### Fixed

- **BREAKING**: Fixed product link selector to match Good Eggs' actual URL format (`/producer/product/id` instead of `/product/`)
- Fixed page navigation timeouts by using `domcontentloaded` instead of `networkidle` (Good Eggs has persistent connections that prevent networkidle from completing)
- Products are now correctly extracted using the `js-product-link` CSS class
- Added URL validation to ensure product links have the expected 3-segment path structure

### Changed

- Added maximum quantity validation (1-99) with integer check to `add_to_cart` tool
- Added validation for empty product identifiers in `remove_from_cart` tool
- Fixed `search_for_freebie_groceries` to check homepage and /fresh-picks for $0.00 items instead of deals page
- Increased wait times after page load (from 1s to 3s) to allow React components to render

## [0.1.0] - 2026-01-04

### Added

- Initial implementation of Good Eggs MCP server
- `search_for_grocery` tool for searching grocery items
- `get_favorites` tool for retrieving user's favorite items
- `get_grocery_details` tool for product details
- `add_to_cart` tool for adding items to shopping cart
- `search_for_freebie_groceries` tool for finding deals
- `get_list_of_past_order_dates` tool for order history
- `get_past_order_groceries` tool for viewing past order items
- `add_favorite` tool for adding items to favorites
- `remove_favorite` tool for removing items from favorites
- `remove_from_cart` tool for removing items from cart
- Playwright-based browser automation with stealth mode
- Automatic login on first tool use
- Persistent browser session across tool calls
- Smart page detection to minimize navigation
- URL validation to ensure only Good Eggs URLs are accepted
- Minimum quantity validation (quantity must be >= 1)
- Explicit error handling when quantity cannot be set
