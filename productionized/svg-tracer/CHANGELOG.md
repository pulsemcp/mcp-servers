# Changelog

All notable changes to the SVG Tracer MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
