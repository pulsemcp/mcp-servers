# image-diff MCP Server

A Model Context Protocol (MCP) server for programmatic image comparison and visual diff generation. Compares two images pixel-by-pixel, identifies clusters of visual differences, and generates heatmap visualizations.

Designed for comparing design mock screenshots against actual UI implementations.

## How It Works

1. **Pixel comparison** using YIQ NTSC perceptual color distance (accounts for how humans perceive color differences)
2. **Anti-aliasing detection** to filter out false positives from font smoothing and rounded corners
3. **Connected Component Labeling** to group adjacent diff pixels into spatial clusters
4. **Heatmap generation** with yellow-to-red intensity gradient showing severity of differences

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
- `heatmapPath`: file path to the generated heatmap image
- `compositePath`: file path to the heatmap overlaid on the source image

**Requirements:**

- Images must be accessible as local file paths
- Supports PNG, JPEG, WebP, TIFF input formats
- Images can have different dimensions — the smaller image is automatically aligned within the larger one

## Cluster Severity Ratings

Each diff cluster is classified by severity:

- **trivial**: isolated pixel differences, usually inconsequential
- **minor**: small localized differences (e.g., slight color shift)
- **moderate**: noticeable regional differences
- **major**: large or intense differences covering significant area

## Credits

- Pixel comparison algorithm forked from [pixelmatch](https://github.com/mapbox/pixelmatch) by Mapbox (ISC License)
- Color distance based on "Measuring perceived color difference using YIQ NTSC transmission color space in mobile applications" by Y. Kotsarenko and F. Ramos
- Anti-aliasing detection based on "Anti-aliased Pixel and Intensity Slope Detector" by V. Vysniauskas, 2009
- Connected Component Labeling uses the classic two-pass algorithm with Union-Find
- Image I/O powered by [sharp](https://github.com/lovell/sharp) (Apache 2.0 License)
- Clustering approach inspired by [looks-same](https://github.com/gemini-testing/looks-same) by Gemini Testing (MIT License)
