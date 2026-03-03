# Design Decisions

Documents the non-obvious architectural and implementation choices in the image-diff MCP server — what was decided, what alternatives were considered, and why.

For algorithm-level details (formulas, constants, tuning), see [ALGORITHM_NOTES.md](./ALGORITHM_NOTES.md).

---

## Why Fork Pixelmatch

**Decision**: Fork ~180 lines from [pixelmatch](https://github.com/mapbox/pixelmatch) (ISC License) into `pixel-diff.ts`.

**What was kept as-is**:

- `colorDelta()` — YIQ NTSC perceptual color distance
- `antialiased()` — anti-aliasing detection via 3x3 neighborhood analysis
- `hasManySiblings()` — edge detection helper
- Input validation and identical-image fast path

**What was modified**: The main comparison loop was extended to produce a per-pixel `Float32Array` intensity map (0.0 = match, >0.0 = diff, -1.0 = AA) instead of just writing colored pixels to an output buffer. This intensity map drives all downstream processing: clustering, heatmap generation, severity scoring.

**Alternatives considered**:

- **looks-same**: Uses a vendored 1000-line graph library (`jsgraphs.min.js`) just to implement union-find — a 10-line algorithm. Also operates on bounding boxes rather than pixel masks, losing spatial precision.
- **odiff**: Zig-based native binary with SIMD. Forking would require Zig toolchain setup and cross-compilation for 7 platform/arch targets. The Node binding is just `child_process.execFile()`. The 6x speed advantage doesn't matter for single on-demand comparisons (100-300ms baseline).
- **Build from scratch**: The YIQ color math and AA detection are well-documented 30-year-old techniques, but pixelmatch's implementation is battle-tested (7k+ GitHub stars). Forking 180 lines is less error-prone than reimplementing.

---

## Why YIQ Color Space (Not RGB)

**Decision**: Use YIQ NTSC perceptual color distance for pixel comparison.

Human vision is non-uniform: ~2.5x more sensitive to luminance changes than to hue changes. RGB Euclidean distance treats all channels equally, producing false positives on color shifts that humans perceive as minor and false negatives on brightness changes that humans notice immediately.

The YIQ weighting (50.53% luminance, 29.9% orange-blue, 19.57% purple-green) is derived from the NTSC television standard, which was specifically designed around human visual perception.

---

## Why Sharp (Not pngjs or ImageMagick)

**Decision**: Use [sharp](https://github.com/lovell/sharp) as the sole image I/O dependency.

- Native libvips binding — fast decode/encode/resize
- Format-agnostic: PNG, JPEG, WebP, AVIF, TIFF (UI screenshots come in various formats)
- Returns raw RGBA `Uint8Array` buffers directly usable by pixel algorithms
- Resize uses Lanczos3 with gamma correction
- 12M+ weekly npm downloads, well-maintained

**Alternative considered**: pngjs (pure JS, zero native deps). Handles only PNG though — insufficient since screenshots are often JPEG or WebP.

---

## Why Chebyshev Distance for Cluster Merging

**Decision**: Use L-infinity (Chebyshev) distance between bounding box edges, not Euclidean.

UI elements are axis-aligned. A cluster 10px to the right feels "the same distance away" as one 10px below. Euclidean distance would make diagonal neighbors appear farther (14px for same 10px grid offset), which doesn't match how humans visually group UI elements.

Chebyshev is also simpler to compute (no square root) and easier to reason about in terms of pixel grid offsets.

---

## Why Auto-Clustering Uses Nearest-Neighbor Distances

**Decision**: Compute the natural gap from nearest-neighbor distances, not all-pairwise distances.

**What was tried first**: All-pairwise distances with "largest absolute jump" detection. This was too aggressive — font-change produced gap=724 (merging everything into 1 cluster) because the all-pairwise distribution is dominated by far-apart clusters.

**What was tried second**: Nearest-neighbor distances with "largest jump" detection. Better, but layout-shift produced 190 clusters because all NN distances were uniformly distributed (0-8 range, max jump=1), giving no natural break.

**Final approach**: NN distances with natural breaks + dimension-aware fallback. The fallback (3% of smaller dimension, clamped [5,50]) handles the uniform-distribution case. This produces 5-40 clusters across all tested scenarios.

The key insight: nearest-neighbor distances reflect _local_ clustering structure (how tight groups are), while all-pairwise distances reflect _global_ spread. For UI diff clustering, local structure is what matters.

---

## Why the Dimension Fallback is 3% (Not 1% or 5%)

**Decision**: When no natural break exists in NN distances, use `min(width, height) * 0.03`, clamped to [5, 50].

- **1%** was too conservative: didn't merge font glyphs into words on 800px images (gap=8, but letter spacing is ~12px)
- **5%** was too aggressive: merged unrelated UI sections on typical dashboards (gap=40, spanning multiple card boundaries)
- **3%** is the empirical sweet spot: on 800×600 images, gap=18 groups glyphs into words and nearby elements into regions

The [5, 50] clamp handles edge cases: tiny images (50×4 test case) and very large images (4K screenshots).

---

## Why `clusterGap: undefined` vs `clusterGap: 0` vs `clusterGap: N`

**Decision**: Three-way semantics for the `cluster_gap` parameter.

- **`undefined`** (omitted): auto-compute the optimal gap — this is the "just do the right thing" mode
- **`0`**: explicitly no merging — every CCL-connected component is a separate cluster
- **`> 0`**: explicit gap — caller has a specific merge distance in mind

The previous API defaulted `clusterGap` to `0`. This was changed to `undefined` because most callers don't know what gap value to use, and the raw cluster count (hundreds for font changes) is overwhelming. Auto-computation makes the default experience much better.

**Implementation detail**: The function signature uses `clusterGap?: number` and checks `clusterGap === undefined` (not truthiness) to distinguish "not set" from "set to 0".

---

## Why Gap Suggestions Skip O(n²) Work for Explicit Gaps

**Decision**: When `clusterGap` is explicitly provided, don't compute pairwise distances for suggestions. Return `null` for both `suggestedSmallerGap` and `suggestedLargerGap`.

If the caller explicitly chose a gap, they likely know what they're doing and don't need suggestions. Computing all-pairwise distances (O(n²)) just for suggestions is wasted work. For 331 clusters (font change), that's 54,615 distance calculations — not terrible in absolute terms, but pointless overhead.

Auto-gap mode already computes pairwise distances as part of the natural breaks analysis, so suggestions come "for free" in that path.

---

## Why OpenCV ZNCC Hybrid (Not Pure Multi-Scale or Pure OpenCV)

**Decision**: Use OpenCV ZNCC at downsampled resolution for coarse search, then pixel-level ZNCC at full resolution for refinement.

**Benchmark data** (from alignment testing on 1024×768 scene with various templates):

| Method                          | Speed                   | Pixel Accuracy          |
| ------------------------------- | ----------------------- | ----------------------- |
| Pure multi-scale (JS)           | 700-2000ms              | Exact (±0px)            |
| Pure OpenCV ZNCC (full res)     | Minutes (WASM overhead) | Exact                   |
| OpenCV ZNCC (0.25x) only        | 20-90ms                 | ±4px (limited by scale) |
| **Hybrid (0.25x + refinement)** | **70-150ms**            | **±1px**                |

The hybrid combines OpenCV's speed advantage at low resolution with pixel-precise refinement. Multi-scale is kept as a fallback for environments where opencv-wasm is unavailable.

---

## Why Top-Level `await import('opencv-wasm')`

**Decision**: Import opencv-wasm eagerly at module scope, not lazily inside async functions.

Dynamic `import('opencv-wasm')` inside async functions deadlocks when called from built JavaScript. This includes promise-based lazy singletons (`let promise = import('opencv-wasm')`). The deadlock occurs because:

1. ESM dynamic import resolution is asynchronous
2. opencv-wasm's WASM initialization is synchronous
3. In the built JS pipeline, these interact to create a circular wait

The deadlock only manifests when: (a) code is compiled to JS, (b) called through the full MCP pipeline, and (c) the WASM module hasn't been loaded yet. Direct vitest execution of TypeScript source doesn't trigger it.

**Trade-off**: Top-level `await` adds ~50ms startup cost, but this is the only reliable approach.

---

## Why No External API Dependencies

**Decision**: All image processing is local. No cloud services, no API keys, no `.env` file.

- **Deterministic**: Same inputs always produce same outputs (no server-side processing variation)
- **Offline**: Works without internet
- **Fast**: No network latency (processing is 100-300ms)
- **Simple**: No credential management, rate limiting, or API versioning
- **Private**: Image data never leaves the machine

This also means no manual test script with credentials is needed — functional tests with synthetic/generated images provide full coverage.

---

## Why Float32Array Intensity Map (Not Boolean Diff Mask)

**Decision**: Store per-pixel diff intensity as `Float32Array` (0.0-1.0) instead of a boolean "different or not" mask.

Most image diff tools (including pixelmatch's default output) produce binary results: each pixel is either "same" or "different." This loses the magnitude of difference, which is valuable for:

1. **Heatmap visualization**: Color gradient from yellow (subtle) to red (severe)
2. **Severity classification**: Mean intensity per cluster distinguishes "slight color shift" from "completely different content"
3. **Anti-aliasing separation**: The `-1.0` sentinel value cleanly separates AA pixels without needing a separate data structure
4. **Debugging**: Examining raw intensity values reveals whether differences are from genuine content changes or rendering artifacts

---

## Why Composite Overlay Uses Raw Buffer (Not Temp File)

**Decision**: When alignment crops a region from the scene image, the composite source is passed as `{ data: Uint8Array, width, height }` instead of writing a temp file and passing its path.

This avoids:

- Temp file creation and cleanup
- Disk I/O for a buffer that's already in memory
- Race conditions if multiple comparisons run concurrently

The `generateCompositeHeatmap()` function accepts either a file path string or a raw buffer object, handling both the normal case (same-size, source is a file) and the alignment case (cropped region is a buffer).

---

## Why 8-Connectivity (Not 4-Connectivity) for CCL

**Decision**: Use 8-connectivity (diagonal neighbors included) for Connected Component Labeling.

With 4-connectivity, a diagonal line of diff pixels would be split into separate clusters. In UI rendering, anti-aliased edges and angled text strokes produce diagonal diff patterns that humans perceive as a single region.

8-connectivity groups these correctly, at the cost of occasionally merging two genuinely separate small clusters that happen to touch at a diagonal corner. This is an acceptable trade-off because `clusterGap` merging handles close-but-separate clusters anyway.

---

## Why `minClusterSize` Defaults to 4 (Not 1)

**Decision**: Ignore clusters smaller than 4 pixels by default.

Single-pixel and 2-3 pixel "clusters" are almost always rendering noise: subpixel anti-aliasing differences, gamma rounding, JPEG compression artifacts. Including them inflates cluster count without providing useful signal.

The value 4 was chosen because it's the smallest size that represents a genuine visual element (a 2×2 block of different-colored pixels is visible to the eye; a single pixel generally isn't).

---

## Why 100M Pixel OOM Guard

**Decision**: Reject images larger than 100 million pixels (~10K × 10K).

At 100M pixels, memory usage for the pipeline:

- Source RGBA buffer: 400MB
- Target RGBA buffer: 400MB
- Intensity map (Float32Array): 400MB
- Cluster labels (Int32Array): 400MB
- Total: ~1.6GB

This is at the edge of what a typical Node.js process can handle. The guard is in `diffImages()` (the pipeline entry point) so users get a clear error message upfront rather than an OOM crash deep in the algorithm.

Typical screenshots are 1920×1080 (2.1M pixels) or 3840×2160 (8.3M pixels), well within limits.

---

## Why the Severity Formula Weights Area 5x More Than Intensity

```
score = areaPercentage * 10 + meanIntensity * 50
```

A large low-intensity region (e.g., a layout shift that moves content by a few pixels) is more concerning than a tiny high-intensity pixel (e.g., a single red-vs-blue pixel). The 10:50 ratio at first glance seems to weight intensity 5x more, but `areaPercentage` values are typically 0.01-10% while `meanIntensity` values are 0.1-1.0. In practice:

- A cluster covering 1% area with 0.2 intensity: `1*10 + 0.2*50 = 20` (moderate)
- A cluster covering 0.01% area with 1.0 intensity: `0.01*10 + 1.0*50 = 50.1` (major)
- A cluster covering 5% area with 0.1 intensity: `5*10 + 0.1*50 = 55` (major)

This means tiny high-intensity diffs and large low-intensity diffs both score as significant, which matches human perception.
