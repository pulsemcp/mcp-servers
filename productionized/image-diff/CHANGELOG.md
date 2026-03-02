# Changelog

## [Unreleased]

### Fixed

- Fixed `identical` field contradicting `description` when minClusterSize filters all clusters
- Added Uint32Array byte alignment guard to prevent crashes with non-4-aligned buffers
- Added maximum image dimension check (100M pixels) to prevent OOM on extremely large images

## [0.1.0]

### Added

- Initial implementation of image-diff MCP server
- `get_diff_of_images` tool for pixel-by-pixel image comparison
- Pixel comparison engine forked from pixelmatch (YIQ NTSC color space)
- Anti-aliasing detection to reduce false positives on font smoothing and rounded corners
- Connected Component Labeling (CCL) for spatial clustering of diff regions
- Per-cluster severity classification (trivial/minor/moderate/major)
- Heatmap generation with yellow-to-red intensity gradient
- Composite heatmap overlay on source image
- Support for PNG, JPEG, WebP, and TIFF input formats via sharp
