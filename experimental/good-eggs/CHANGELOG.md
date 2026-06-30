# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.11] - 2026-06-29

### Fixed

- Made `add_to_cart` resilient to the frequent false negative where the add succeeded server-side but the tool reported "Could not find add to cart button". The button is now waited for (it can render a beat after `domcontentloaded`) with a broader, case-insensitive selector set, and the cart is read both before and after every add attempt and reconciled against the requested item/quantity. Success is judged by the before/after quantity delta, so an item that was already in the cart is never misreported as a fresh add when the attempt changed nothing. The returned result reflects the true cart state: a confirmed add (even when the button couldn't be located), a partial add (quantity increased but still below requested), an already-satisfied result (item already at the requested quantity, nothing added), or a genuine failure (e.g. a delivery day still needs to be selected) — instead of a misleading button-not-found error.
- `add_to_cart` no longer hard-fails when quantity controls are missing; quantity setting is best-effort and the actual resulting quantity is reported from cart verification.
- `remove_from_cart` now verifies the removal against the re-read cart state instead of trusting the click, so it reports accurate success/failure (and the remaining quantity when the item is still present).
- `add_favorite` and `remove_favorite` now wait for the favorite control to render rather than synchronously null-checking it, reducing spurious "Could not find favorite button" errors.
- Navigation during `add_to_cart` reloads once on a stale-page / re-render error rather than failing the whole add.

## [0.1.10] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.1.9] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.1.8] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

### Changed

- Improved README setup section for better consistency with other MCP servers

## [0.1.7] - 2026-01-18

### Fixed

- Fixed `add_favorite` and `remove_favorite` tools to use correct CSS selector (`.product-detail__favorite-control`) matching Good Eggs' actual page structure where the favorite control is a div element, not a button

## [0.1.6] - 2026-01-17

### Fixed

- Fixed `remove_from_cart` tool to use correct CSS selectors matching Good Eggs' actual page structure (`.js-basket-item` and `.summary-item__*` classes)
- `remove_from_cart` now tries both a direct remove button and setting quantity to 0 via the quantity dropdown

## [0.1.5] - 2026-01-16

### Added

- Added `get_cart` tool to view the contents of your shopping cart, including product names, quantities, unit sizes, and prices
- Added `isFavorite` field to `search_for_grocery` results showing whether each item is in your favorites list
- Search results now display a heart emoji (❤️) next to favorited items

### Changed

- Updated search results formatting to include "Favorite: Yes/No" indicator
- Improved product tile parsing to use the `.product-tile` container for better data extraction

## [0.1.4] - 2026-01-15

### Added

- Added `quantityOrdered` field to `get_past_order_groceries` output showing how many units were ordered (e.g., 2)
- Added `quantity` field (unit of sale) to `get_past_order_groceries` output showing the unit size (e.g., "1 bunch", "1 lb", "15 oz")
- Price is now included in `get_past_order_groceries` output

### Changed

- Switched `get_past_order_groceries` from using the `/reorder` page to the `/account/orders/{orderId}` page for more accurate order details including actual quantities ordered

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
