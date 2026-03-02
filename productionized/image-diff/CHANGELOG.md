# Changelog

## [Unreleased]

### Added

- `auto_align` optional parameter: automatically finds the best alignment of a smaller image within a larger one when dimensions differ. Uses OpenCV ZNCC template matching (via opencv-wasm) for fast, accurate alignment (~50-90ms). Enables comparing Figma mocks of individual components against full-page screenshots
- `cluster_gap` optional parameter: merges nearby clusters whose bounding boxes are within N pixels of each other. Useful for grouping scattered glyph fragments (e.g. font changes) into logical regions instead of hundreds of tiny clusters

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
