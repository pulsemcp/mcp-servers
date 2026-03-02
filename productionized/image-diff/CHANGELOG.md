# Changelog

## [Unreleased]

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
