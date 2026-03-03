---
name: implement-figma-design
description: Implement a UI component from a Figma design by iterating with visual diff feedback. Use when the user provides a Figma design reference and asks you to build or match it in code.
argument-hint: <figma-url-or-description>
---

# Implement Figma Design

Build a UI component that matches a Figma design by writing code, screenshotting the result, diffing against the design, and iterating until pixel-level convergence.

## Checklist

- [ ] Verify pre-requisites (MCP servers, dev server)
- [ ] Capture reference screenshot from Figma
- [ ] Write initial implementation
- [ ] Start dev server (or confirm it's running)
- [ ] Enter diff loop: screenshot -> diff -> analyze clusters -> fix -> repeat
- [ ] Converge to <= 0.01% diff
- [ ] Report final results to user

## Pre-requisites

- [ ] **Figma MCP server** is available (needed to inspect designs and export frames)
- [ ] **Playwright MCP server** is available (needed to screenshot the running UI)
- [ ] **image-diff MCP server** is available (needed to diff screenshots against the design)
- [ ] A dev server command is known (e.g., `npm run dev`, `vite`, `next dev`) — ask the user if unclear

> **If any MCP server pre-requisite is not met, STOP immediately and tell the user which MCP server is missing.** Do not attempt to work around missing servers.

## Input

- `$ARGUMENTS`: A Figma URL, frame name, or description of the design to implement
- The user's codebase with a working dev server setup

## Procedure

### Step 1: Capture the Figma Reference

Use the Figma MCP server to get the design:

1. If given a Figma URL, extract the file key and node ID
2. Use the Figma MCP server to export the target frame/component as a PNG screenshot
3. Save it to a known path (e.g., `/tmp/figma-reference.png`)
4. Inspect the Figma design for key details: colors, fonts, spacing, layout structure, responsive behavior

> **Tip:** Capture the frame at the same viewport width you'll use for the dev server screenshots. Mismatched dimensions trigger auto-alignment, which works but adds noise.

### Step 2: Write the Initial Implementation

Based on the Figma inspection from Step 1:

1. Identify which file(s) to create or modify
2. Write the component/page code, matching the design's structure, colors, typography, and spacing as closely as possible from visual inspection
3. Don't aim for perfection — get the structure right and let the diff loop handle refinement

### Step 3: Ensure the Dev Server is Running

1. Start the dev server if it isn't already running (run it in the background)
2. Wait for it to be ready (check for the "ready" or "listening" message)
3. Note the URL (e.g., `http://localhost:3000`)

### Step 4: Screenshot the Current State

Use the Playwright MCP server:

1. Navigate to the page/route showing your implementation
2. Wait for the page to be fully loaded and rendered (wait for network idle or a key selector)
3. Take a screenshot and save to a known path (e.g., `/tmp/current-impl.png`)

> **Viewport:** Match the Figma frame dimensions. If the Figma frame is 1440x900, set the Playwright viewport to 1440x900 before screenshotting.

### Step 5: Run the Diff

Use the image-diff MCP server's `get_diff_of_images` tool:

- `source_image`: the Figma reference screenshot path
- `target_image`: the current implementation screenshot path
- Leave `cluster_gap` unset to use auto-clustering
- Leave other parameters at defaults

### Step 6: Analyze Diff Results

Check the response:

1. **If `identical: true` or `diffPercentage <= 0.01`** — you're done. Go to Step 8.
2. **Otherwise**, analyze each cluster to assign a root cause:

For each cluster in the `clusters` array:

- **Read the cluster's bounding box** (`x`, `y`, `width`, `height`) to understand where the diff is
- **Open the heatmap** (`heatmapPath`) and the composite image (`compositePath`) to visually inspect what's different
- **Classify the root cause** into one of these categories:

| Root Cause              | Symptoms                                      | Fix Strategy                                                           |
| ----------------------- | --------------------------------------------- | ---------------------------------------------------------------------- |
| **Color mismatch**      | Heatmap shows uniform intensity in a region   | Extract exact color from Figma, update CSS                             |
| **Typography**          | Heatmap follows text shapes, jagged edges     | Match font-family, font-size, font-weight, line-height, letter-spacing |
| **Spacing/padding**     | Heatmap shows offset bands or shifted content | Adjust margin, padding, or gap values                                  |
| **Missing element**     | Large cluster where content should exist      | Add the missing element from the Figma design                          |
| **Extra element**       | Large cluster where nothing should exist      | Remove the element not present in the design                           |
| **Layout shift**        | Content is correct but displaced              | Fix flex/grid layout, alignment, or positioning                        |
| **Border/radius**       | Heatmap outlines element edges                | Match border-width, border-color, border-radius                        |
| **Shadow/elevation**    | Soft heatmap glow around elements             | Add or adjust box-shadow values                                        |
| **Image/icon**          | Cluster matches an image or icon region       | Replace with correct asset, check sizing                               |
| **Anti-aliasing noise** | Tiny scattered clusters (<0.01% each)         | Ignore — these are rendering differences, not bugs                     |

> **Key insight:** Don't just look at the heatmap in isolation. Compare the source (Figma) and target (implementation) images side-by-side in the cluster region to understand what changed. The heatmap tells you _where_, your eyes tell you _why_.

### Step 7: Apply Fixes and Loop

1. For each root cause identified in Step 6, apply the fix in code
2. Save your changes (the dev server should hot-reload)
3. Go back to **Step 4** (screenshot -> diff -> analyze)

**Loop exit conditions:**

- `diffPercentage <= 0.01` — **success**, go to Step 8
- You've completed 10 iterations without convergence — **stop and report** remaining clusters to the user for manual review
- The remaining diffs are all anti-aliasing noise (tiny scattered clusters, `diffPercentage < 0.05` and no cluster > 0.01% individually) — **success**, go to Step 8

**Each iteration should make measurable progress.** If `diffPercentage` hasn't decreased after a fix, reconsider your root cause analysis — you may be fixing the wrong thing.

### Step 8: Report Results

Summarize what you did:

```
Implemented [component/page] matching Figma design.
Final diff: [X]% ([N] pixels across [M] clusters)
Iterations: [N]
Key changes: [list major fixes applied]
```

If there are remaining diffs above the threshold, explain what they are and why they couldn't be resolved automatically (e.g., dynamic content, animation state, font rendering differences).

## Output

- The implemented component/page code matching the Figma design
- Final diff percentage and cluster count
- Screenshots: reference, final implementation, and final heatmap

## Important

- **Viewport consistency is critical.** The biggest source of false diffs is mismatched viewport dimensions between the Figma export and the Playwright screenshot. Always match them.
- **Hot reload lag.** After saving code changes, wait at least 1-2 seconds before screenshotting to let the dev server rebuild and the browser re-render.
- **Font rendering.** Browser font rendering will never be pixel-identical to Figma's renderer. Anti-aliasing differences on text are expected — focus on structural and color accuracy, not sub-pixel text rendering.
- **Dynamic content.** If the page has animations, carousels, or loading states, ensure you screenshot a stable state. Use Playwright's `waitForSelector` or `waitForTimeout` to reach the right moment.
- **Don't chase zero.** A `diffPercentage` of 0.00% is rarely achievable due to anti-aliasing and renderer differences. The 0.01% threshold accounts for this.
- **Large designs.** For full pages, consider breaking the design into sections and implementing/diffing each section independently to get more targeted feedback.
