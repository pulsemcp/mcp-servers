# Manual Testing Results

This file tracks the **most recent** manual test results for the image-diff MCP server.

**Note:** Each new test run should overwrite the previous results. We only maintain the latest test results here.

## Latest Test Results

**Test Date:** 2026-03-02
**Branch:** agent-orchestrator/add-image-diff-server
**Commit:** e3ecc85
**Tested By:** Claude
**Environment:** Linux, Node.js, Local image processing (no external APIs)

### Overall: ✅ All 12 functional tests passed

### Test Results

**Type:** Functional unit tests + end-to-end Playwright screenshot scenarios
**Status:** ✅ All tests passed

**Functional Tests (12/12 passing):**

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

**End-to-End Playwright Scenarios (6/6 verified):**

1. **Identical gradients** — 0% diff, correctly reports `identical: true`
2. **Gradient color shift** — 0% at default threshold (expected), 18.6% with dramatic shift; 2 clusters detected
3. **Font change (sans → serif)** — 0.79% diff, 110 clusters from subtle glyph differences
4. **Padding difference** — 1.02% diff, 118 clusters from layout shift
5. **Button color change** — 3.44% diff, 2 clusters with major severity
6. **Missing elements/badges** — 0.25% diff, 2 clusters identifying removed content

**Note on Manual Testing:** This server performs local image processing only — it does not connect to any external APIs. All functionality was verified through functional unit tests and end-to-end scenarios using Playwright-generated screenshots. Heatmap and composite images were generated and visually inspected for all scenarios.
