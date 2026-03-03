# Changelog

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
- Automatic alignment for different-sized images using OpenCV ZNCC template matching (via opencv-wasm) with pixel-level refinement. Enables comparing Figma mocks of individual components against full-page screenshots
- `cluster_gap` optional parameter: merges nearby clusters whose bounding boxes are within N pixels of each other. Useful for grouping scattered glyph fragments (e.g. font changes) into logical regions
- **Auto-clustering**: When `cluster_gap` is omitted, the engine automatically computes the optimal merge distance using nearest-neighbor distance analysis with natural breaks. The `clustering` metadata in the response shows what gap was used and suggests alternatives for tuning
- `clustering` field in `ImageDiffResult`: includes `gapUsed`, `autoGap`, `suggestedSmallerGap`, and `suggestedLargerGap` for transparent gap reporting and tuning guidance
- Uint32Array byte alignment guard to prevent crashes with non-4-aligned buffers
- Maximum image dimension check (100M pixels) to prevent OOM on extremely large images
- Comprehensive README with visual examples covering all scenarios
