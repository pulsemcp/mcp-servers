# Manual Testing Results

This file tracks the **most recent** manual test results for the image-diff MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Latest Test Results

**Test Date:** 2026-03-02
**Branch:** agent-orchestrator/add-image-diff-server
**Commit:** a0f2341
**Tested By:** Claude
**Environment:** Linux, Node.js, Local image processing (no external APIs)

### Overall: ✅ All 40 functional tests passed (2 test files)

### Test Results

**Type:** Functional unit tests + alignment tests + end-to-end Playwright screenshot scenarios
**Status:** ✅ All tests passed

**diff-engine.test.ts (26/26 passing):**

- pixelDiff: identical images detection (fast path)
- pixelDiff: completely different images (100% diff)
- pixelDiff: single pixel difference detection
- pixelDiff: intensity map values between 0 and 1
- pixelDiff: size mismatch error handling
- findDiffClusters: zero-intensity map returns no clusters
- findDiffClusters: single diff pixel cluster detection
- findDiffClusters: adjacent pixel merging into one cluster
- findDiffClusters: two separate cluster identification
- findDiffClusters: minimum cluster size filtering
- findDiffClusters: anti-aliased pixel exclusion (negative intensity)
- findDiffClusters: mean intensity calculation accuracy
- findDiffClusters: merge nearby clusters when clusterGap is set
- findDiffClusters: combine statistics correctly when merging clusters
- alignment helpers: toGrayscale converts RGBA to luminance
- alignment helpers: sobelEdges detects edges
- alignment helpers: downsample reduces resolution correctly
- alignment helpers: orderBySize identifies scene and template correctly
- alignMultiScale: finds exact template position in synthetic scene
- alignMultiScale: finds pattern not at the origin
- alignMultiScale: throws when template is larger than scene
- alignImages (OpenCV ZNCC hybrid): finds exact template position
- alignImages (OpenCV ZNCC hybrid): finds pattern not at the origin
- alignImages (OpenCV ZNCC hybrid): agrees with multi-scale on same input
- alignImages (OpenCV ZNCC hybrid): throws when template is larger than scene
- alignImages (OpenCV ZNCC hybrid): does not false-match on uniform white regions

**alignment.test.ts (14/14 passing):**

- toGrayscale: converts RGBA to grayscale using luminance weights
- toGrayscale: produces 0 for black and ~255 for white
- sobelEdges: detects edges at sharp transitions
- sobelEdges: produces zero edges for a solid image
- downsample: reduces dimensions by the given factor
- downsample: averages pixel values correctly
- orderBySize: identifies the larger image as scene
- orderBySize: swaps when first image is smaller
- alignMultiScale: finds pattern at top-left corner
- alignMultiScale: finds pattern at interior position
- alignMultiScale: finds pattern at bottom-right corner
- alignMultiScale: handles larger images with downsampling
- alignMultiScale: throws when template is larger than scene
- alignMultiScale: returns low confidence for solid-color template

**End-to-End auto_align Scenarios (6/6 verified):**

All scenarios tested with full pipeline (diffImages with autoAlign=true) using Playwright-generated dashboard screenshots (1024x1138 full page vs individual component mocks):

| Scenario         | Template Size | Position Found | Confidence | Time | Diff % | Clusters |
| ---------------- | ------------- | -------------- | ---------- | ---- | ------ | -------- |
| stats-card-exact | 680x128       | (260, 75)      | 1.000      | 85ms | 0.000% | 0        |
| stats-card-diff  | 680x142       | (260, 75)      | 0.881      | 47ms | 2.210% | 121      |
| users-table      | 680x386       | (260, 223)     | 1.000      | 75ms | 0.000% | 0        |
| sidebar          | 240x1083      | (0, 55)        | 1.000      | 92ms | 0.000% | 0        |
| form-card        | 500x489       | (260, 629)     | 1.000      | 70ms | 0.000% | 0        |
| header           | 960x55        | (0, 0)         | 1.000      | 50ms | 0.000% | 0        |

**Previous Same-Size E2E Scenarios (6/6 verified):**

1. **Identical gradients** — 0% diff, correctly reports `identical: true`
2. **Gradient color shift** — 0% at default threshold (expected), 18.6% with dramatic shift; 2 clusters detected
3. **Font change (sans → serif)** — 0.79% diff, 110 clusters from subtle glyph differences
4. **Padding difference** — 1.02% diff, 118 clusters from layout shift
5. **Button color change** — 3.44% diff, 2 clusters with major severity
6. **Missing elements/badges** — 0.25% diff, 2 clusters identifying removed content

**Note on Manual Testing:** This server performs local image processing only — it does not connect to any external APIs. All functionality was verified through functional unit tests and end-to-end scenarios using Playwright-generated screenshots. Heatmap and composite images were generated and visually inspected for all scenarios.
