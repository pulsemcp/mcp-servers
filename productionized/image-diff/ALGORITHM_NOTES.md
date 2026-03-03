# Algorithm Notes

Deep reference for the image-diff engine's core algorithms. Use this when troubleshooting unexpected results, tuning parameters, or considering changes to the clustering/alignment logic.

See also: [DESIGN_DECISIONS.md](./DESIGN_DECISIONS.md) for the "why" behind architectural choices.

---

## Pixel Comparison (pixel-diff.ts)

### YIQ NTSC Color Distance

The engine uses YIQ perceptual color distance, not RGB Euclidean distance.

```
y = dr * 0.29889531 + dg * 0.58662247 + db * 0.11448223  (luminance)
i = dr * 0.59597799 - dg * 0.27417610 - db * 0.32180189  (orange-blue)
q = dr * 0.21147017 - dg * 0.52261711 + db * 0.31114694  (purple-green)
delta = 0.5053 * y² + 0.299 * i² + 0.1957 * q²
```

Humans perceive luminance changes ~2.5x more than color hue changes. The YIQ weights encode this: 50.53% luminance, 29.9% orange-blue, 19.57% purple-green. This means a brightness shift registers as a larger delta than an equivalent-magnitude hue shift.

`MAX_YIQ_DELTA = 35215` is the theoretical maximum (black vs white). Per-pixel intensity is normalized to `[0, 1]` via `delta / MAX_YIQ_DELTA`.

### Anti-Aliasing Detection

The `antialiased()` function examines a pixel's 3x3 neighborhood to identify font smoothing and rounded-corner artifacts. A pixel is classified as AA if:

1. It has many same-color neighbors (potential edge pixel)
2. Its neighbors form a consistent directional pattern
3. That pattern indicates subpixel smoothing rather than a real content difference

AA pixels are stored as intensity `-1.0` in the Float32Array intensity map. This negative sentinel cleanly separates them from real diffs (positive values) and matches (zero).

### The `threshold` Parameter

`threshold` (0-1, default 0.1) controls how much YIQ delta is tolerated before a pixel counts as different. The comparison: `delta > threshold * threshold * MAX_YIQ_DELTA`.

- `0.05`: Strict — catches subtle color shifts, font weight differences
- `0.1`: Default — good for typical UI comparison
- `0.2`: Lenient — ignores minor rendering differences

### Fast Path for Identical Images

Before running per-pixel YIQ comparison, the engine does a 32-bit word comparison (`Uint32Array` view over the RGBA buffer). If every word matches, it exits immediately.

**Gotcha**: Creating a `Uint32Array` view requires 4-byte alignment. If the buffer's `byteOffset % 4 !== 0`, the engine creates an aligned copy first. This can happen with cropped buffers from alignment.

---

## Clustering (clustering.ts)

### Connected Component Labeling (CCL)

Two-pass algorithm with 8-connectivity (includes diagonal neighbors):

- **Pass 1**: Scan left-to-right, top-to-bottom. For each diff pixel, check 4 already-labeled neighbors: NW, N, NE, W. Assign minimum neighbor label; union overlapping labels.
- **Pass 2**: Replace each label with its root representative via `find()`.

Union-Find uses path-halving compression (`parent[x] = parent[parent[x]]`), giving amortized O(n·α(n)) — nearly linear.

**8-connectivity gotcha**: Two diff pixels touching only at a diagonal corner are grouped into the same cluster, but two pixels separated by 1px of white space become separate clusters. This is why font changes produce hundreds of tiny glyph-level clusters without gap-based merging.

### Auto-Clustering: Natural Gap Computation

When `clusterGap` is `undefined` (omitted by caller), the engine auto-computes the optimal merge distance:

#### Step 1: Nearest-Neighbor Distances

For each cluster, compute the Chebyshev distance to its closest neighbor. This produces one distance per cluster, sorted ascending.

**Why nearest-neighbor, not all-pairwise**: The natural gap should reflect local structure (how close nearby clusters are), not global distribution. All-pairwise distances are dominated by far-apart clusters and obscure local grouping patterns.

#### Step 2: Natural Breaks Detection

Sort NN distances and find the largest jump (gap between consecutive values):

```
Example: NN distances = [2, 2, 3, 3, 34, 38]
Jumps: [0, 1, 0, 31, 4]
Largest jump: 31 (at index 3, between value 3 and 34)
Natural gap = 3 (the value before the jump)
```

The jump must be ≥2px to count as a genuine natural break. This prevents false breaks from identical or near-identical distances (e.g., `[3, 3, 3, 3]` has jumps of 0 — no natural break).

#### Step 3: Dimension-Aware Fallback

When no natural break exists (common for font changes, layout shifts where diffs are uniformly distributed):

```
gap = min(imageWidth, imageHeight) * 0.03
clamped to [5, 50]
```

| Image Size | Fallback Gap          | Effect                                                 |
| ---------- | --------------------- | ------------------------------------------------------ |
| 50×4       | 5 (clamped from 0.12) | Merges tightly packed small clusters                   |
| 800×600    | 18                    | Groups glyphs into words, nearby elements into regions |
| 1920×1080  | 32                    | Groups related UI sections                             |
| 4000×3000  | 50 (clamped from 90)  | Prevents over-aggressive merging                       |

**Why 3%**: Empirically tuned. 1% was too conservative (didn't group glyphs into words). 5% was too aggressive (merged unrelated regions). 3% produces 5-40 clusters on typical UI comparisons.

**Why clamp to [5, 50]**: Lower bound prevents micro-images from having gap=0 (defeating the purpose). Upper bound prevents 4K images from having gap=90+ (merging entire page sections).

#### Step 4: Two-Cluster Cap

When only 2 clusters exist, the NN distance is capped at the dimension heuristic value. Without this, two clusters on opposite corners of a 1000px image would have NN distance ~1000px and be merged into one — clearly wrong.

### Cluster Gap Merging

Iterative O(n²) merge loop:

```
while (any merge happened):
  for each pair (i, j):
    if chebyshevDistance(bbox_i, bbox_j) <= effectiveGap:
      merge j into i (expand bbox, sum pixels/intensity)
      restart scan
```

**Why iterative**: Merging changes bounding boxes, potentially bringing previously-distant clusters into range. Single-pass misses transitive merges (A close to B, B close to C, but A not close to C before B merges with A).

**Performance**: O(n²) per iteration, typically 2-5 iterations. For 331 raw clusters (font change), this takes <5ms. For 1000+ clusters it could be slow, but the `minClusterSize=4` filter already reduces raw clusters significantly.

### Chebyshev Distance (L-infinity)

```typescript
horizGap = max(0, max(a.left, b.left) - min(a.right, b.right) - 1);
vertGap = max(0, max(a.top, b.top) - min(a.bottom, b.bottom) - 1);
distance = max(horizGap, vertGap);
```

**Why Chebyshev over Euclidean**: UI elements are axis-aligned. A cluster 10px to the right feels the same distance as one 10px below. Euclidean would make diagonal neighbors appear farther away (14px for same 10px offset), which doesn't match human UI perception.

**The `-1` is critical**: For `a.right=5` and `b.left=8`, the actual gap is 2 pixels (positions 6, 7). Without `-1` you'd compute `8 - 5 = 3`, overcounting by 1.

### Gap Suggestions in `ClusteringMeta`

- `suggestedSmallerGap`: largest unique pairwise distance strictly less than `gapUsed`
- `suggestedLargerGap`: smallest unique pairwise distance strictly greater than `gapUsed`

**Important caveat**: These are computed from pre-merge pairwise distances. After merging, cluster bounding boxes change, so the actual effect of the suggested gap may differ from expectations. They're directional hints, not precise predictions.

**When `clusterGap` is explicit**: No distance computation is done (saves O(n²) work). Both suggestions are `null`.

### Severity Classification

```
score = areaPercentage * 10 + meanIntensity * 50
major:    score ≥ 30
moderate: score ≥ 10
minor:    score ≥ 3
trivial:  score < 3
```

Area is weighted ~5x more than intensity because a large low-intensity region (layout shift) is more concerning than a tiny high-intensity pixel (rendering artifact).

---

## Alignment (alignment.ts)

### OpenCV ZNCC Hybrid Strategy

Two-stage approach combining speed with precision:

**Stage 1 — Coarse Search (Downsampled OpenCV ZNCC)**:

- Downsample both images by a computed scale factor
- Scale factor chosen so result matrix ≤100,000 pixels (keeps WASM fast)
- Run `cv.matchTemplate()` with `TM_CCOEFF_NORMED` (DFT-based, very fast)
- Get top match position at downsampled coordinates

**Stage 2 — Fine Refinement (Full-Resolution Pixel ZNCC)**:

- Search a small neighborhood (±radius) around the coarse match at full resolution
- Radius = `max(scaleFactor + 1, 3)` — wider search at higher downsampling
- Per-position ZNCC computed directly on raw pixel data
- Returns sub-pixel-accurate final position

### Why ZNCC

Zero-mean Normalized Cross-Correlation subtracts the mean from both template and search window before correlating. This makes it immune to:

- **White/solid background false positives**: A white-on-white region has zero variance → correlation is undefined → returns 0, not a false positive
- **Global brightness differences**: Mean subtraction normalizes absolute brightness
- **Contrast differences**: Standard deviation normalization handles different contrast levels

### Confidence Score

```
confidence = (zncc_score + 1) / 2
```

Maps ZNCC range [-1, +1] to [0, 1]:

- 1.0 = perfect match
- 0.5 = no correlation (random)
- 0.0 = anti-correlated (inverted)

In practice, real UI matches score 0.7-1.0. Below 0.5 indicates likely misalignment.

### Performance Characteristics

| Method                    | Speed    | Accuracy        | Notes              |
| ------------------------- | -------- | --------------- | ------------------ |
| OpenCV ZNCC (downsampled) | 20-90ms  | ±scaleFactor px | Fast but imprecise |
| OpenCV ZNCC hybrid        | 70-150ms | ±1px            | Best balance       |

### OpenCV WASM Import

**Critical**: `opencv-wasm` must be imported at module scope with top-level `await`:

```typescript
const cv = await import('opencv-wasm');
```

Dynamic imports inside async functions (including promise-based lazy singletons) deadlock when called from the built JavaScript pipeline. This is a module resolution interaction between ESM dynamic imports and WASM synchronous initialization. The deadlock only manifests in built JS, not in direct TypeScript execution via vitest.

---

## Heatmap Visualization (heatmap.ts)

### Color Gradient

```
intensity 0.0 → yellow  (R=255, G=255, B=0)
intensity 0.5 → orange  (R=255, G=128, B=0)
intensity 1.0 → red     (R=255, G=0,   B=0)
```

Implementation: `green = 255 * (1 - intensity)`, red stays 255.

### Alpha Channel

- Match pixels (intensity=0): fully transparent (alpha=0)
- AA pixels (intensity=-1): semi-transparent yellow (alpha=60)
- Diff pixels: `alpha = 100 + 155 * intensity` (range 100-255)

The minimum alpha of 100 ensures even subtle diffs are visible in the heatmap. The scaling with intensity makes severe diffs visually dominant.

### Composite Overlay

The composite is created by overlaying the heatmap PNG on the source image at 60% opacity (`sharp.composite({ blend: 'over' })`). The composite source can be either:

- A file path (normal same-size comparison)
- A raw RGBA buffer (alignment scenario, where source is a cropped region)

---

## Troubleshooting & Tuning Guide

### "Too many clusters" (hundreds on a simple diff)

**Symptom**: Font change or layout shift produces 100+ clusters instead of ~10-40.

**Cause**: Auto-gap computation found no natural break in NN distances (all clusters are uniformly spaced). The dimension fallback may not be aggressive enough for your image.

**Fix**: Pass an explicit `cluster_gap` value. Start with 10-20 for typical UI, increase until cluster count is manageable. Use the `clustering.suggestedLargerGap` from a previous run as guidance.

### "Too few clusters" (everything merged into 1-3 giant clusters)

**Symptom**: Entire page sections merged into a single cluster.

**Cause**: Auto-gap is too large (NN distances have a misleading natural break), or explicit `cluster_gap` is too high.

**Fix**: Pass `cluster_gap: 0` to see the raw cluster count, then increase gradually. The `clustering.suggestedSmallerGap` can guide you.

### "Auto-gap merges things that shouldn't be merged"

**Symptom**: Two visually distinct regions get merged because they're within the auto-gap distance.

**Cause**: The natural breaks algorithm found the right "within-group" distance, but some between-group distances happen to fall below it.

**Fix**: Use an explicit `cluster_gap` slightly smaller than the problematic auto-gap. Check `clustering.gapUsed` to see what was computed.

### "Alignment finds wrong position"

**Symptom**: Confidence is low (<0.7) or the aligned region is clearly wrong.

**Possible causes**:

1. Template is mostly solid color / low variance (ZNCC degenerates)
2. Template appears multiple times in the scene (ZNCC picks highest score, may be wrong instance)
3. Template has been significantly modified (large diff makes correlation low)

**Fix**: Ensure the template has distinctive structural content (not just solid backgrounds). If alignment is wrong, fall back to same-size comparison by pre-cropping images yourself.

### "AA pixels are counted as diffs"

**Fix**: Ensure `include_aa` is `false` (default). If you're comparing images rendered by different engines (e.g., Chrome vs Firefox), AA patterns will differ significantly and the detector may not catch all of them. Lower `threshold` to 0.05 for stricter comparison that better distinguishes real changes from rendering artifacts.

### "Diffs detected in identical images"

**Possible causes**:

1. Images are JPEG (lossy) — re-encoding produces different pixel values
2. Images were rendered by different engines at same content
3. Subtle alpha channel differences

**Fix**: Use PNG for lossless comparison. If comparing across rendering engines, increase `threshold` to 0.15-0.2.

### Tuning the Dimension Fallback

The 3%/[5,50] heuristic is hardcoded in `computeNaturalGap()`. If you need to change it:

1. The `0.03` multiplier controls how aggressively nearby clusters merge
2. The `5` lower clamp prevents zero-gap on tiny images
3. The `50` upper clamp prevents over-merging on large images

To experiment, modify these values in `clustering.ts` and run `scripts/generate-readme-examples.mjs` to see the effect across all test scenarios. The font-change and layout-shift scenarios are the most sensitive to this parameter.
