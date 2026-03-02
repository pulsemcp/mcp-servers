import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { diffImages } from '../diff-engine/index.js';

const PARAM_DESCRIPTIONS = {
  source_image:
    'Absolute file path to the source/reference image (e.g. the design mock). Supports PNG, JPEG, WebP, TIFF.',
  target_image:
    'Absolute file path to the target/comparison image (e.g. the actual UI screenshot). Supports PNG, JPEG, WebP, TIFF.',
  threshold:
    'Color matching sensitivity from 0 to 1. Lower values detect subtler differences. 0.1 is a good default for UI comparison. Use 0.05 for strict comparison or 0.2 for lenient.',
  include_aa:
    'Whether to count anti-aliased pixels (font smoothing, rounded corners) as differences. Default false excludes them to reduce noise.',
  min_cluster_size:
    'Minimum number of connected diff pixels to report as a cluster. Filters out isolated pixel noise. Default 4.',
  cluster_gap:
    'Maximum pixel distance between cluster bounding boxes to merge them into a single cluster. Use 0 (default) for pixel-precise clusters, or 5-20 to group nearby diff regions together (e.g. glyph fragments within a word, or scattered changes in a UI section).',
} as const;

export const GetDiffOfImagesSchema = z.object({
  source_image: z.string().min(1).describe(PARAM_DESCRIPTIONS.source_image),
  target_image: z.string().min(1).describe(PARAM_DESCRIPTIONS.target_image),
  threshold: z.number().min(0).max(1).optional().describe(PARAM_DESCRIPTIONS.threshold),
  include_aa: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_aa),
  min_cluster_size: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(PARAM_DESCRIPTIONS.min_cluster_size),
  cluster_gap: z.number().int().min(0).optional().describe(PARAM_DESCRIPTIONS.cluster_gap),
});

export function getDiffOfImagesTool(_server: Server) {
  return {
    name: 'get_diff_of_images',
    description: `Compare two images pixel-by-pixel and identify visual differences.

Returns structured diff data including:
- Overall diff percentage and pixel counts
- Clusters of different regions with bounding box coordinates (x, y, width, height)
- Severity rating per cluster (trivial/minor/moderate/major)
- File paths to generated heatmap images showing diff intensity

**Heatmap output**: A PNG image where diff regions are colored from yellow (subtle difference) to red (major difference). A composite version overlays this on the source image for easy comparison.

**Use cases:**
- Compare a design mock screenshot against actual UI implementation
- Compare a Figma mock of a single component against a full-page screenshot (auto-aligned)
- Detect visual regressions between two versions of a page
- Verify CSS/layout changes only affect intended areas

**Requirements:**
- Images must be accessible as local file paths
- Images can have different dimensions — the smaller image is automatically aligned within the larger one using template matching

**Note:** Anti-aliased pixels (font smoothing, rounded corners) are excluded by default to reduce false positives. Set include_aa=true to include them.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_image: { type: 'string', description: PARAM_DESCRIPTIONS.source_image },
        target_image: { type: 'string', description: PARAM_DESCRIPTIONS.target_image },
        threshold: { type: 'number', description: PARAM_DESCRIPTIONS.threshold },
        include_aa: { type: 'boolean', description: PARAM_DESCRIPTIONS.include_aa },
        min_cluster_size: {
          type: 'integer',
          description: PARAM_DESCRIPTIONS.min_cluster_size,
        },
        cluster_gap: {
          type: 'integer',
          description: PARAM_DESCRIPTIONS.cluster_gap,
        },
      },
      required: ['source_image', 'target_image'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetDiffOfImagesSchema.parse(args);

        const result = await diffImages(validated.source_image, validated.target_image, {
          threshold: validated.threshold,
          includeAA: validated.include_aa,
          minClusterSize: validated.min_cluster_size,
          clusterGap: validated.cluster_gap,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[get_diff_of_images] Error: ${message}`);
        return {
          content: [{ type: 'text' as const, text: `Error: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
