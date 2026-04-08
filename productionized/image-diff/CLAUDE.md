# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the image-diff MCP server.

## Overview

image-diff is an MCP server for programmatic image comparison. It compares two images pixel-by-pixel, identifies clusters of visual differences using Connected Component Labeling, and generates heatmap visualizations. No external APIs or LLMs — all processing is local.

## Deep-Dive Documentation

- **[DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md)**: Why things are the way they are — alternatives considered, trade-offs made
- **[ALGORITHM_NOTES.md](./ALGORITHM_NOTES.md)**: How the algorithms work in detail — formulas, constants, tuning, troubleshooting

Read these before making non-trivial changes to the diff engine or clustering logic.

## Architecture

The server uses a two-layer architecture:

1. **`shared/`**: Core business logic
   - `diff-engine/pixel-diff.ts`: Pixel comparison engine forked from pixelmatch (YIQ NTSC color space)
   - `diff-engine/clustering.ts`: CCL with Union-Find + auto-clustering via nearest-neighbor natural breaks
   - `diff-engine/heatmap.ts`: Heatmap generation (yellow-to-red gradient) and composite overlay via sharp
   - `diff-engine/alignment.ts`: Auto-alignment for different-sized images (OpenCV ZNCC hybrid)
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
npm test               # Functional tests (26 tests across 2 files)

# Regenerate README examples (requires prior build)
node scripts/generate-readme-examples.mjs

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
- Images can have different dimensions — auto-alignment finds the smaller image within the larger one
- Auto-alignment uses OpenCV ZNCC (via opencv-wasm) at downsampled resolution + pixel-level refinement
- Supported formats: PNG, JPEG, WebP, TIFF (via sharp)

## Key Algorithms

### Pixel Comparison (pixel-diff.ts)

- Forked from [pixelmatch](https://github.com/mapbox/pixelmatch) (ISC License)
- Extended with Float32Array intensity map for heatmap generation
- `threshold` parameter controls sensitivity (0-1, default 0.1)

### Clustering (clustering.ts)

- Connected Component Labeling with 8-connectivity
- Union-Find with path-halving for efficient merging
- Auto-clustering: when `clusterGap` is omitted, computes optimal gap via nearest-neighbor distance analysis with natural breaks detection + dimension-aware fallback (see [ALGORITHM_NOTES.md](./ALGORITHM_NOTES.md))
- Three-way `clusterGap` semantics: `undefined` = auto, `0` = no merging, `>0` = explicit gap
- Per-cluster severity classification based on area + intensity score
- `minClusterSize` parameter filters noise (default 4 pixels)
- Response includes `clustering` metadata with `gapUsed`, `autoGap`, and gap suggestions

### Heatmap (heatmap.ts)

- Yellow (#FFFF00) at low intensity → Red (#FF0000) at high intensity
- Alpha scales with intensity (100-255 range)
- Composite overlays heatmap on source image at 60% opacity

## Testing Strategy

- **Functional tests**: Unit tests for pixel-diff, clustering, and alignment algorithms (`tests/functional/`)
- Two test files: `diff-engine.test.ts` (22 tests) and `alignment.test.ts` (4 tests)
- No external API dependencies, so no manual tests with credentials needed
- **Example generation**: `scripts/generate-readme-examples.mjs` produces 9 scenarios with heatmaps, composites, and JSON output — useful for visual verification after algorithm changes

## Critical Gotchas

### opencv-wasm Import Deadlock

`import('opencv-wasm')` as a dynamic import inside async functions deadlocks when called from built JS. The only reliable approach is top-level `await import('opencv-wasm')` at module scope. See [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md#why-top-level-await-importopencv-wasm) for details.

### Uint32Array Byte Alignment

Creating a `Uint32Array` view over a buffer requires 4-byte alignment. The pixel-diff fast path handles misaligned buffers by copying, but be careful if adding new `Uint32Array` usage.

### `clusterGap: undefined` vs `0`

These are semantically different. `undefined` triggers auto-gap computation; `0` means "no merging." Use `clusterGap?: number` (optional) and check `=== undefined`, not truthiness.

## Claude Learnings

### Intensity Map Design

- Using Float32Array with -1.0 for AA pixels cleanly separates anti-aliasing from real diffs
- The intensity normalization (`delta / MAX_YIQ_DELTA`) produces values that map well to visual heat
- `identical` field should check both `diffCount === 0` AND `clusters.length === 0` to avoid contradictions with the description

### Auto-Clustering Algorithm Evolution

Three approaches were tried before landing on the current one:

1. **All-pairwise distances + largest jump**: Too aggressive (font-change: 1 cluster)
2. **Nearest-neighbor distances + largest jump**: Good for structured diffs, but layout-shift had no natural break (190 clusters)
3. **NN distances + dimension-aware fallback**: Current approach — handles both cases well (5-40 clusters typically)

See [ALGORITHM_NOTES.md](./ALGORITHM_NOTES.md#troubleshooting--tuning-guide) for troubleshooting unexpected cluster counts.
