# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Playwright-based browser automation with stealth mode
- Automatic login on first tool use
- Persistent browser session across tool calls
- Smart page detection to minimize navigation
- URL validation to ensure only Good Eggs URLs are accepted
- Minimum quantity validation (quantity must be >= 1)
- Explicit error handling when quantity cannot be set
