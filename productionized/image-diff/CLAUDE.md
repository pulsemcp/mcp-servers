# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the image-diff MCP server.

## Overview

image-diff is an MCP server for programmatic image comparison. It compares two images pixel-by-pixel, identifies clusters of visual differences using Connected Component Labeling, and generates heatmap visualizations. No external APIs or LLMs — all processing is local.

## Architecture

The server uses a two-layer architecture:

1. **`shared/`**: Core business logic
   - `diff-engine/pixel-diff.ts`: Pixel comparison engine forked from pixelmatch (YIQ NTSC color space)
   - `diff-engine/clustering.ts`: Connected Component Labeling (CCL) with Union-Find for spatial clustering
   - `diff-engine/heatmap.ts`: Heatmap generation (yellow-to-red gradient) and composite overlay via sharp
   - `diff-engine/index.ts`: Pipeline orchestrator that wires the stages together
   - `tools/get-diff-of-images.ts`: MCP tool definition with Zod validation
   - `server.ts`: MCP server factory
   - `tools.ts`: Tool registration with ListTools/CallTool handlers

2. **`local/`**: Stdio transport implementation
   - Minimal wrapper around shared functionality
   - Uses StdioServerTransport for Claude Desktop integration
   - References shared via development symlink

## Development Commands

```bash
# Build
npm run build          # Builds shared, then local

# Test
npm test               # Functional tests (12 tests)

# Development
cd local
node setup-dev.js      # Create shared symlink for dev
npm run dev            # Development with auto-reload
```

## Implementation Notes

- The pixel comparison algorithm uses YIQ NTSC perceptual color distance (not simple RGB)
- Anti-aliasing detection examines 3x3 neighborhoods to filter font smoothing false positives
- CCL uses a two-pass algorithm with 8-connectivity and path-halving Union-Find compression
- Heatmap output uses `os.tmpdir()/image-diff-output/` with timestamp-based filenames
- Maximum supported image size: 100 million pixels (~10K x 10K)
- Images must have identical dimensions (no auto-resize)
- Supported formats: PNG, JPEG, WebP, TIFF (via sharp)

## Key Algorithms

### Pixel Comparison (pixel-diff.ts)

- Forked from [pixelmatch](https://github.com/mapbox/pixelmatch) (ISC License)
- Extended with Float32Array intensity map for heatmap generation
- `threshold` parameter controls sensitivity (0-1, default 0.1)

### Clustering (clustering.ts)

- Connected Component Labeling with 8-connectivity
- Union-Find with path-halving for efficient merging
- Per-cluster severity classification based on area + intensity score
- `minClusterSize` parameter filters noise (default 4 pixels)

### Heatmap (heatmap.ts)

- Yellow (#FFFF00) at low intensity → Red (#FF0000) at high intensity
- Alpha scales with intensity (100-255 range)
- Composite overlays heatmap on source image at 60% opacity

## Testing Strategy

- **Functional tests**: Unit tests for pixel-diff and clustering algorithms (`tests/functional/`)
- No external API dependencies, so no manual tests with credentials needed

## Claude Learnings

### Intensity Map Design

- Using Float32Array with -1.0 for AA pixels cleanly separates anti-aliasing from real diffs
- The intensity normalization (`delta / MAX_YIQ_DELTA`) produces values that map well to visual heat
- `identical` field should check both `diffCount === 0` AND `clusters.length === 0` to avoid contradictions with the description
