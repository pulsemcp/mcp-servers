# Changelog

All notable changes to the SVG Tracer MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-06-14

### Fixed

- Raised the `zod` dependency floor from `^3.24.1` to `^3.25.76` so `npx` can no longer resolve a zod version that lacks the `zod/v4` subpath export. `@modelcontextprotocol/sdk@^1.29` imports `zod/v4` (first shipped in zod 3.25.0); the previous floor permitted zod 3.24.x, which has no `zod/v4` export and intermittently crashed server startup under `npx ...@latest` with `ERR_UNSUPPORTED_DIR_IMPORT`.

## [0.1.2] - 2026-05-17

### Fixed

- Set `mcpName` in `local/package.json` to `com.pulsemcp/<server>` so the MCP Registry can validate npm-package ownership and successfully publish this server.

## [0.1.1] - 2026-04-12

- Migration verification: no-op patch version bump to validate internal→public distribution pipeline

## [0.1.0] - 2026-03-06

### Added

- Initial implementation of `trace_bitmap_to_svg` tool
- Support for PNG, JPG, WebP, BMP, GIF, TIFF input formats
- Automatic alpha channel preprocessing for transparent PNGs (converts to black-on-white mask)
- Customizable tracing parameters: threshold, turdSize, optTolerance
- Custom fill color and background color support
- Target size scaling with aspect ratio preservation for icon generation
- Output SVG to filesystem or return inline
- Functional test suite with 32 tests across 7 image fixture types
- Integration test suite via TestMCPClient with 6 end-to-end tests

### Fixed

- License changed from MIT to GPL-2.0 to match potrace dependency license
- Server name in MCP protocol now uses `@pulsemcp/svg-tracer-mcp-server` for consistency
- Hex color validation now only accepts valid CSS hex lengths (3, 4, 6, or 8 chars)
- `targetWidth`-only or `targetHeight`-only now derives the missing dimension from aspect ratio
- Removed `"types": ["node"]` from local/tsconfig.json to prevent CI failures
- Test that writes default output path now uses tmp directory instead of fixtures
