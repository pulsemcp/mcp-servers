# image-diff MCP Server

A Model Context Protocol (MCP) server for programmatic image comparison and visual diff generation. Compares two images pixel-by-pixel, identifies clusters of visual differences, and generates heatmap visualizations.

Designed for comparing design mock screenshots against actual UI implementations.

## How It Works

1. **Pixel comparison** using YIQ NTSC perceptual color distance (accounts for how humans perceive color differences)
2. **Anti-aliasing detection** to filter out false positives from font smoothing and rounded corners
3. **Connected Component Labeling** to group adjacent diff pixels into spatial clusters
4. **Heatmap generation** with yellow-to-red intensity gradient showing severity of differences
5. **Automatic alignment** for different-sized images using OpenCV ZNCC template matching

## Tools

### `get_diff_of_images`

Compare two images and get structured diff results.

**Parameters:**
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `source_image` | string | Yes | - | Absolute path to the reference image |
| `target_image` | string | Yes | - | Absolute path to the comparison image |
| `threshold` | number | No | 0.1 | Color matching sensitivity (0-1, lower = more sensitive) |
| `include_aa` | boolean | No | false | Count anti-aliased pixels as differences |
| `min_cluster_size` | number | No | 4 | Minimum connected pixels to form a cluster |
| `cluster_gap` | number | No | 0 | Max pixel gap to merge nearby clusters (0 = no merging) |

**Returns:**

- `identical`: boolean indicating if images match
- `summary`: overall diff statistics (pixel counts, percentages, cluster count)
- `clusters`: array of diff regions with bounding boxes, severity ratings, and intensity metrics
- `alignment` (when images differ in size): position coordinates, confidence score, strategy used, and timing
- `dimensions`: width and height of the compared region
- `heatmapPath`: file path to the generated heatmap image
- `compositePath`: file path to the heatmap overlaid on the source image

**Requirements:**

- Images must be accessible as local file paths
- Supports PNG, JPEG, WebP, TIFF input formats
- Images can have different dimensions — the smaller image is automatically aligned within the larger one

#### Tool Call Shape

**MCP tool call input** (minimal — just the two required paths):

```json
{
  "name": "get_diff_of_images",
  "arguments": {
    "source_image": "/path/to/design-mock.png",
    "target_image": "/path/to/screenshot.png"
  }
}
```

**MCP tool call input** (with all optional parameters):

```json
{
  "name": "get_diff_of_images",
  "arguments": {
    "source_image": "/path/to/design-mock.png",
    "target_image": "/path/to/screenshot.png",
    "threshold": 0.05,
    "include_aa": true,
    "min_cluster_size": 10,
    "cluster_gap": 15
  }
}
```

**MCP response** (same-size images with differences):

```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"identical\": false,\n  \"summary\": {\n    \"totalPixels\": 480000,\n    \"diffPixels\": 737,\n    \"diffPercentage\": 0.154,\n    \"antiAliasedPixels\": 1034,\n    \"matchingPixels\": 478229,\n    \"clusterCount\": 43,\n    \"description\": \"0.15% of pixels differ across 43 cluster(s). Severity breakdown: 22 major, 4 moderate, 14 minor, 3 trivial.\"\n  },\n  \"clusters\": [ ... ],\n  \"heatmapPath\": \"/tmp/image-diff-output/heatmap-1234567890.png\",\n  \"compositePath\": \"/tmp/image-diff-output/composite-1234567890.png\",\n  \"dimensions\": { \"width\": 800, \"height\": 600 }\n}"
    }
  ]
}
```

The `text` field contains the full JSON result as a string. When parsed, the full response shape looks like this:

<details>
<summary>Full parsed response shape (same-size images, with differences)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 737,
    "diffPercentage": 0.154,
    "antiAliasedPixels": 1034,
    "matchingPixels": 478229,
    "clusterCount": 43,
    "description": "0.15% of pixels differ across 43 cluster(s). Severity breakdown: 22 major, 4 moderate, 14 minor, 3 trivial."
  },
  "clusters": [
    {
      "id": 1,
      "left": 452,
      "top": 157,
      "right": 478,
      "bottom": 165,
      "width": 27,
      "height": 9,
      "pixelCount": 94,
      "totalImagePixels": 480000,
      "areaPercentage": 0.02,
      "meanIntensity": 0.109,
      "maxIntensity": 0.343,
      "severity": "minor"
    }
  ],
  "heatmapPath": "/tmp/image-diff-output/heatmap-1234567890.png",
  "compositePath": "/tmp/image-diff-output/composite-1234567890.png",
  "dimensions": {
    "width": 800,
    "height": 600
  }
}
```

</details>

<details>
<summary>Full parsed response shape (identical images)</summary>

```json
{
  "identical": true,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 0,
    "diffPercentage": 0,
    "antiAliasedPixels": 0,
    "matchingPixels": 480000,
    "clusterCount": 0,
    "description": "Images are identical (no differences detected)."
  },
  "clusters": [],
  "heatmapPath": "/tmp/image-diff-output/heatmap-1234567890.png",
  "compositePath": "/tmp/image-diff-output/composite-1234567890.png",
  "dimensions": {
    "width": 800,
    "height": 600
  }
}
```

</details>

<details>
<summary>Full parsed response shape (different-size images — auto-alignment)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 108800,
    "diffPixels": 9031,
    "diffPercentage": 8.301,
    "antiAliasedPixels": 329,
    "matchingPixels": 99440,
    "clusterCount": 12,
    "description": "8.30% of pixels differ across 12 cluster(s). Severity breakdown: 1 major, 5 moderate, 6 minor."
  },
  "clusters": [
    {
      "id": 1,
      "left": 20,
      "top": 185,
      "right": 299,
      "bottom": 215,
      "width": 280,
      "height": 31,
      "pixelCount": 8349,
      "totalImagePixels": 108800,
      "areaPercentage": 7.674,
      "meanIntensity": 0.242,
      "maxIntensity": 0.244,
      "severity": "major"
    }
  ],
  "alignment": {
    "x": 680,
    "y": 212,
    "confidence": 0.993,
    "strategy": "opencv-zncc-hybrid",
    "alignmentTimeMs": 76,
    "templateImage": "target",
    "originalDimensions": {
      "source": { "width": 1024, "height": 768 },
      "target": { "width": 320, "height": 340 }
    }
  },
  "heatmapPath": "/tmp/image-diff-output/heatmap-1234567890.png",
  "compositePath": "/tmp/image-diff-output/composite-1234567890.png",
  "dimensions": {
    "width": 320,
    "height": 340
  }
}
```

Note: The `alignment` field only appears when images have different dimensions. The `dimensions` field reflects the size of the compared region (the template size after alignment, not the full scene). The `compositePath` field is optional in the interface but always present when called via the MCP tool.

</details>

---

## Examples

All examples below use this dashboard as the **source image** (800×600):

![Source dashboard](docs/examples/dashboard-source.png)

---

### Example 1: Identical Images — No Differences

When two images are pixel-identical, the engine short-circuits and returns immediately.

| Source                                        | Target                                           | Composite                                           |
| --------------------------------------------- | ------------------------------------------------ | --------------------------------------------------- |
| ![source](docs/examples/dashboard-source.png) | ![target](docs/examples/dashboard-identical.png) | ![composite](docs/examples/identical-composite.png) |

The composite overlay shows the source image with no heatmap highlights — because there are no differences.

<details>
<summary>Structured output</summary>

```json
{
  "identical": true,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 0,
    "diffPercentage": 0,
    "antiAliasedPixels": 0,
    "matchingPixels": 480000,
    "clusterCount": 0,
    "description": "Images are identical (no differences detected)."
  }
}
```

</details>

---

### Example 2: Color & Value Changes

The target has updated stat values ("12,847" → "13,205", "$48,290" → "$52,180") and different percentage text. The engine finds **43 clusters** across the changed text and numbers.

| Source                                        | Target                                              |
| --------------------------------------------- | --------------------------------------------------- |
| ![source](docs/examples/dashboard-source.png) | ![target](docs/examples/dashboard-color-change.png) |

| Standalone Heatmap                                 | Composite Overlay                                      |
| -------------------------------------------------- | ------------------------------------------------------ |
| ![heatmap](docs/examples/color-change-heatmap.png) | ![composite](docs/examples/color-change-composite.png) |

The **standalone heatmap** shows only the diff pixels on a transparent background — yellow means lower intensity, red means higher intensity. The **composite overlay** blends the heatmap onto the source image so you can see exactly where differences occur in context.

<details>
<summary>Structured output (43 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 737,
    "diffPercentage": 0.154,
    "antiAliasedPixels": 1034,
    "matchingPixels": 478229,
    "clusterCount": 43,
    "description": "0.15% of pixels differ across 43 cluster(s). Severity breakdown: 22 major, 4 moderate, 14 minor, 3 trivial."
  },
  "clusters": [
    {
      "id": 1,
      "left": 452,
      "top": 157,
      "right": 478,
      "bottom": 165,
      "width": 27,
      "height": 9,
      "pixelCount": 94,
      "areaPercentage": 0.02,
      "meanIntensity": 0.109,
      "maxIntensity": 0.343,
      "severity": "minor"
    },
    {
      "id": 2,
      "left": 319,
      "top": 132,
      "right": 327,
      "bottom": 142,
      "width": 9,
      "height": 11,
      "pixelCount": 47,
      "areaPercentage": 0.01,
      "meanIntensity": 0.686,
      "maxIntensity": 0.738,
      "severity": "major"
    },
    {
      "id": 3,
      "left": 553,
      "top": 157,
      "right": 561,
      "bottom": 165,
      "width": 9,
      "height": 9,
      "pixelCount": 33,
      "areaPercentage": 0.007,
      "meanIntensity": 0.118,
      "maxIntensity": 0.329,
      "severity": "minor"
    }
  ]
}
```

_40 more clusters omitted._

</details>

---

### Example 3: Font Change (sans-serif → serif)

The entire page is re-rendered with a serif font (Georgia). Every text element shifts slightly, producing **331 clusters** of small glyph-level differences.

| Source                                        | Target                                             |
| --------------------------------------------- | -------------------------------------------------- |
| ![source](docs/examples/dashboard-source.png) | ![target](docs/examples/dashboard-font-change.png) |

| Standalone Heatmap                                | Composite Overlay                                     |
| ------------------------------------------------- | ----------------------------------------------------- |
| ![heatmap](docs/examples/font-change-heatmap.png) | ![composite](docs/examples/font-change-composite.png) |

The heatmap lights up across every text region — headers, stat values, table content, sidebar labels. Each glyph-level change is its own cluster.

<details>
<summary>Structured output (331 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 11671,
    "diffPercentage": 2.431,
    "antiAliasedPixels": 8326,
    "matchingPixels": 460003,
    "clusterCount": 331,
    "description": "2.43% of pixels differ across 331 cluster(s). Severity breakdown: 61 major, 161 moderate, 105 minor, 4 trivial."
  },
  "clusters": [
    {
      "id": 1,
      "left": 65,
      "top": 88,
      "right": 110,
      "bottom": 98,
      "width": 46,
      "height": 11,
      "pixelCount": 221,
      "severity": "moderate"
    },
    {
      "id": 2,
      "left": 555,
      "top": 317,
      "right": 597,
      "bottom": 329,
      "width": 43,
      "height": 13,
      "pixelCount": 213,
      "severity": "moderate"
    },
    {
      "id": 3,
      "left": 555,
      "top": 391,
      "right": 597,
      "bottom": 403,
      "width": 43,
      "height": 13,
      "pixelCount": 213,
      "severity": "moderate"
    }
  ]
}
```

_328 more clusters omitted._

</details>

#### Using `cluster_gap` to Group Related Differences

331 individual glyph-level clusters is noisy. The `cluster_gap` parameter merges clusters whose bounding boxes are within N pixels of each other:

| `cluster_gap` | Clusters | What Happens                                      |
| ------------- | -------- | ------------------------------------------------- |
| 0 (default)   | 331      | Every glyph fragment is a separate cluster        |
| 10            | **40**   | Nearby fragments within text lines merge together |

With `cluster_gap=10`, the 331 clusters collapse into **40 meaningful groups** — each representing a distinct text block or UI region, not individual character differences.

<details>
<summary>Structured output with cluster_gap=10 (40 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 11671,
    "diffPercentage": 2.431,
    "antiAliasedPixels": 8326,
    "matchingPixels": 460003,
    "clusterCount": 40,
    "description": "2.43% of pixels differ across 40 cluster(s). Severity breakdown: 26 moderate, 14 minor."
  },
  "clusters": [
    {
      "id": 1,
      "left": 434,
      "top": 125,
      "right": 550,
      "bottom": 166,
      "width": 117,
      "height": 42,
      "pixelCount": 912,
      "severity": "moderate"
    },
    {
      "id": 2,
      "left": 246,
      "top": 125,
      "right": 372,
      "bottom": 166,
      "width": 127,
      "height": 42,
      "pixelCount": 883,
      "severity": "moderate"
    },
    {
      "id": 3,
      "left": 625,
      "top": 125,
      "right": 733,
      "bottom": 166,
      "width": 109,
      "height": 42,
      "pixelCount": 716,
      "severity": "moderate"
    }
  ]
}
```

_37 more clusters omitted. Note: same diff pixels, same percentage — only the grouping changes._

</details>

---

### Example 4: Missing Elements (Badges Removed)

The target has status badges ("Complete", "Active") removed from the table — replaced with plain text. The engine detects **83 clusters** precisely locating each removed badge.

| Source                                        | Target                                                |
| --------------------------------------------- | ----------------------------------------------------- |
| ![source](docs/examples/dashboard-source.png) | ![target](docs/examples/dashboard-missing-badges.png) |

| Standalone Heatmap                                   | Composite Overlay                                        |
| ---------------------------------------------------- | -------------------------------------------------------- |
| ![heatmap](docs/examples/missing-badges-heatmap.png) | ![composite](docs/examples/missing-badges-composite.png) |

The heatmap highlights each badge position where the colored pill was replaced with plain text.

<details>
<summary>Structured output (83 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 4506,
    "diffPercentage": 0.939,
    "antiAliasedPixels": 2283,
    "matchingPixels": 473211,
    "clusterCount": 83,
    "description": "0.94% of pixels differ across 83 cluster(s). Severity breakdown: 77 moderate, 6 minor."
  },
  "clusters": [
    {
      "id": 1,
      "left": 570,
      "top": 315,
      "right": 609,
      "bottom": 328,
      "width": 40,
      "height": 14,
      "pixelCount": 220,
      "severity": "moderate"
    },
    {
      "id": 2,
      "left": 570,
      "top": 389,
      "right": 609,
      "bottom": 402,
      "width": 40,
      "height": 14,
      "pixelCount": 220,
      "severity": "moderate"
    },
    {
      "id": 3,
      "left": 391,
      "top": 389,
      "right": 425,
      "bottom": 399,
      "width": 35,
      "height": 11,
      "pixelCount": 198,
      "severity": "moderate"
    }
  ]
}
```

_80 more clusters omitted._

</details>

---

### Example 5: Layout Shift (Padding Change)

The target has increased padding and gaps on the stat cards — everything shifts down slightly. This produces **612 clusters** because content at edges of every card, table row, and text block has shifted.

| Source                                        | Target                                              |
| --------------------------------------------- | --------------------------------------------------- |
| ![source](docs/examples/dashboard-source.png) | ![target](docs/examples/dashboard-layout-shift.png) |

| Standalone Heatmap                                 | Composite Overlay                                      |
| -------------------------------------------------- | ------------------------------------------------------ |
| ![heatmap](docs/examples/layout-shift-heatmap.png) | ![composite](docs/examples/layout-shift-composite.png) |

Layout shifts light up the heatmap everywhere content has repositioned. The high cluster count reflects the ripple effect — every element below the shifted cards moves.

<details>
<summary>Structured output (612 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 480000,
    "diffPixels": 11136,
    "diffPercentage": 2.32,
    "antiAliasedPixels": 10938,
    "matchingPixels": 457926,
    "clusterCount": 612,
    "description": "2.32% of pixels differ across 612 cluster(s). Severity breakdown: 51 major, 468 moderate, 92 minor, 1 trivial."
  },
  "clusters": [
    {
      "id": 1,
      "left": 570,
      "top": 317,
      "right": 597,
      "bottom": 333,
      "width": 28,
      "height": 17,
      "pixelCount": 151,
      "severity": "moderate"
    },
    {
      "id": 2,
      "left": 667,
      "top": 318,
      "right": 684,
      "bottom": 333,
      "width": 18,
      "height": 16,
      "pixelCount": 129,
      "severity": "moderate"
    },
    {
      "id": 3,
      "left": 402,
      "top": 318,
      "right": 425,
      "bottom": 333,
      "width": 24,
      "height": 16,
      "pixelCount": 107,
      "severity": "moderate"
    }
  ]
}
```

_609 more clusters omitted._

</details>

---

## Auto-Alignment: Comparing Different-Sized Images

When the source and target have **different dimensions**, the engine automatically finds where the smaller image (the "template") best matches within the larger one (the "scene"), crops that region, and runs the standard pixel-level comparison. No configuration needed.

**How it works:**

1. **Coarse search** — OpenCV ZNCC (Zero-mean Normalized Cross-Correlation) template matching at downscaled resolution for fast candidate detection
2. **Fine refinement** — Pixel-level ZNCC at full resolution around the coarse match for sub-pixel accuracy
3. **Crop & compare** — The matched region is cropped from the scene and compared pixel-by-pixel against the template

This enables comparing a **Figma component mock** against a **full-page screenshot** directly — no manual cropping needed.

All alignment examples below use this dashboard as the **source (scene)** image (1024×768):

![Full page dashboard](docs/examples/fullpage-source.png)

---

### Auto-Align Example 1: Stats Card Mock vs Full Page

A Figma mock of the stats row (780×100) compared against the full page (1024×768). The mock has updated numbers ("12,847" → "14,205", "$48,290" → "$52,180", "3,847" → "4,102") and different percentages.

| Full Page (1024×768)                       | Stats Card Mock (780×100)                  |
| ------------------------------------------ | ------------------------------------------ |
| ![full](docs/examples/fullpage-source.png) | ![mock](docs/examples/mock-stats-card.png) |

The engine automatically locates the stats row at position **(238, 80)**, crops that 780×100 region from the full page, and compares it against the mock.

| Composite Overlay (on cropped region)                      |
| ---------------------------------------------------------- |
| ![composite](docs/examples/align-stats-card-composite.png) |

The heatmap highlights exactly the changed stat values and percentages within the aligned region.

<details>
<summary>Structured output (114 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 78000,
    "diffPixels": 2570,
    "diffPercentage": 3.295,
    "antiAliasedPixels": 2503,
    "matchingPixels": 72927,
    "clusterCount": 114,
    "description": "3.29% of pixels differ across 114 cluster(s). Severity breakdown: 66 major, 18 moderate, 30 minor."
  },
  "alignment": {
    "x": 238,
    "y": 80,
    "confidence": 0.743,
    "strategy": "opencv-zncc-hybrid",
    "alignmentTimeMs": 145,
    "templateImage": "target",
    "originalDimensions": {
      "source": { "width": 1024, "height": 768 },
      "target": { "width": 780, "height": 100 }
    }
  },
  "clusters": [
    {
      "id": 1,
      "left": 619,
      "top": 23,
      "right": 650,
      "bottom": 31,
      "width": 32,
      "height": 9,
      "pixelCount": 126,
      "severity": "minor"
    },
    {
      "id": 2,
      "left": 423,
      "top": 23,
      "right": 450,
      "bottom": 31,
      "width": 28,
      "height": 9,
      "pixelCount": 110,
      "severity": "moderate"
    },
    {
      "id": 3,
      "left": 30,
      "top": 45,
      "right": 45,
      "bottom": 62,
      "width": 16,
      "height": 18,
      "pixelCount": 83,
      "severity": "major"
    }
  ]
}
```

_111 more clusters omitted._

**Key fields in the `alignment` object:**

- `x`, `y` — where the template was found in the scene (pixel coordinates)
- `confidence` — match quality (0-1, higher is better)
- `strategy` — algorithm used (`opencv-zncc-hybrid`)
- `alignmentTimeMs` — how long alignment took
- `templateImage` — which image was the template (`"target"` means the target was smaller)
- `originalDimensions` — original sizes before alignment
</details>

---

### Auto-Align Example 2: Sidebar Panel Mock vs Full Page

A Figma mock of the right sidebar (320×340) with modified progress values (78→85%, 92→95%, 45→62%) and a different button color (blue → red). Compared against the full page.

| Full Page (1024×768)                       | Sidebar Mock (320×340)                  |
| ------------------------------------------ | --------------------------------------- |
| ![full](docs/examples/fullpage-source.png) | ![mock](docs/examples/mock-sidebar.png) |

The engine finds the sidebar at position **(680, 212)** with **99.3% confidence** in **76ms**, then identifies the changed progress bars and button.

| Composite Overlay (on cropped region)                   | Standalone Heatmap                                  |
| ------------------------------------------------------- | --------------------------------------------------- |
| ![composite](docs/examples/align-sidebar-composite.png) | ![heatmap](docs/examples/align-sidebar-heatmap.png) |

The major cluster at the bottom is the button color change (blue → red). The moderate clusters are the progress bar fill changes.

<details>
<summary>Structured output (12 clusters, top 3 shown)</summary>

```json
{
  "identical": false,
  "summary": {
    "totalPixels": 108800,
    "diffPixels": 9031,
    "diffPercentage": 8.301,
    "antiAliasedPixels": 329,
    "matchingPixels": 99440,
    "clusterCount": 12,
    "description": "8.30% of pixels differ across 12 cluster(s). Severity breakdown: 1 major, 5 moderate, 6 minor."
  },
  "alignment": {
    "x": 680,
    "y": 212,
    "confidence": 0.993,
    "strategy": "opencv-zncc-hybrid",
    "alignmentTimeMs": 76,
    "templateImage": "target",
    "originalDimensions": {
      "source": { "width": 1024, "height": 768 },
      "target": { "width": 320, "height": 340 }
    }
  },
  "clusters": [
    {
      "id": 1,
      "left": 20,
      "top": 185,
      "right": 299,
      "bottom": 215,
      "width": 280,
      "height": 31,
      "pixelCount": 8349,
      "areaPercentage": 7.674,
      "severity": "major"
    },
    {
      "id": 2,
      "left": 146,
      "top": 157,
      "right": 192,
      "bottom": 164,
      "width": 47,
      "height": 8,
      "pixelCount": 370,
      "severity": "moderate"
    },
    {
      "id": 3,
      "left": 238,
      "top": 71,
      "right": 256,
      "bottom": 78,
      "width": 19,
      "height": 8,
      "pixelCount": 146,
      "severity": "moderate"
    }
  ]
}
```

_9 more clusters omitted._

</details>

---

### Auto-Align Example 3: Identical Crop — 0% Diff

An exact crop of the activity table (420×496) from the same full page screenshot. The engine finds the table at the exact position and confirms **0% diff** — proving alignment precision.

| Full Page (1024×768)                       | Table Crop (420×496)                            |
| ------------------------------------------ | ----------------------------------------------- |
| ![full](docs/examples/fullpage-source.png) | ![mock](docs/examples/mock-table-identical.png) |

| Composite Overlay (clean — no diffs)                            |
| --------------------------------------------------------------- |
| ![composite](docs/examples/align-table-identical-composite.png) |

<details>
<summary>Structured output</summary>

```json
{
  "identical": true,
  "summary": {
    "totalPixels": 208320,
    "diffPixels": 0,
    "diffPercentage": 0,
    "antiAliasedPixels": 0,
    "matchingPixels": 208320,
    "clusterCount": 0,
    "description": "Images are identical (no differences detected)."
  },
  "alignment": {
    "x": 244,
    "y": 212,
    "confidence": 1,
    "strategy": "opencv-zncc-hybrid",
    "alignmentTimeMs": 97,
    "templateImage": "target",
    "originalDimensions": {
      "source": { "width": 1024, "height": 768 },
      "target": { "width": 420, "height": 496 }
    }
  }
}
```

100% confidence, 0 diff pixels. The alignment found the exact position and the cropped region matches perfectly.

</details>

---

### Alignment Performance

| Scenario          | Template | Scene    | Position Found | Confidence | Time  |
| ----------------- | -------- | -------- | -------------- | ---------- | ----- |
| Stats card        | 780×100  | 1024×768 | (238, 80)      | 74.3%      | 145ms |
| Sidebar panel     | 320×340  | 1024×768 | (680, 212)     | 99.3%      | 76ms  |
| Table (identical) | 420×496  | 1024×768 | (244, 212)     | 100%       | 97ms  |

---

## Cluster Severity Ratings

Each diff cluster is classified by severity based on pixel count and intensity:

| Severity     | Meaning                         | Typical Cause                                               |
| ------------ | ------------------------------- | ----------------------------------------------------------- |
| **trivial**  | Isolated pixel differences      | Sub-pixel rendering, compression artifacts                  |
| **minor**    | Small localized differences     | Slight color shifts, font weight changes                    |
| **moderate** | Noticeable regional differences | Text changes, badge modifications                           |
| **major**    | Large or intense differences    | Button color changes, missing/added elements, layout shifts |

---

## Credits

- Pixel comparison algorithm forked from [pixelmatch](https://github.com/mapbox/pixelmatch) by Mapbox (ISC License)
- Color distance based on "Measuring perceived color difference using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos
- Anti-aliasing detection based on "Anti-aliased Pixel and Intensity Slope Detector" by V. Vysniauskas, 2009
- Connected Component Labeling uses the classic two-pass algorithm with Union-Find
- Image alignment powered by [opencv-wasm](https://github.com/niconiahi/opencv-wasm) (Apache 2.0 License)
- Image I/O powered by [sharp](https://github.com/lovell/sharp) (Apache 2.0 License)
- Clustering approach inspired by [looks-same](https://github.com/gemini-testing/looks-same) by Gemini Testing (MIT License)
