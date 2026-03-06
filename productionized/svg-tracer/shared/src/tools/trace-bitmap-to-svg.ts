import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { traceToSvg } from '../tracer/index.js';

const PARAM_DESCRIPTIONS = {
  input_path:
    'Absolute path to the input bitmap image file. ' +
    'Supported formats: PNG, JPG/JPEG, BMP, GIF, TIFF, WebP. ' +
    'Example: "/tmp/logo.png"',
  output_path:
    'Absolute path where the output SVG file will be written. ' +
    'If not specified, defaults to the same directory and filename as input with .svg extension. ' +
    'Example: "/tmp/logo.svg"',
  threshold:
    'Black/white threshold for tracing (0-255). ' +
    'Lower values capture more detail; higher values simplify. Default: 128.',
  turd_size:
    'Suppress speckles of up to this many pixels. ' +
    'Increase to remove noise, decrease to preserve fine detail. Default: 2.',
  opt_tolerance:
    'Curve optimization tolerance (0-1). ' +
    'Higher values produce simpler curves; lower values preserve detail. Default: 0.2.',
  color:
    'Fill color for the traced SVG paths as a hex color string. ' +
    'Example: "#FF5733" for orange, "#000000" for black. Default: "#000000".',
  background:
    'Background color for the SVG. ' +
    'Use "transparent" for no background, or a hex color string. Default: "transparent".',
  target_width:
    'Target width for the output SVG viewBox in pixels. ' +
    'The traced paths will be scaled to fit. Preserves aspect ratio. ' +
    'Example: 50 for a 50px wide icon.',
  target_height:
    'Target height for the output SVG viewBox in pixels. ' +
    'The traced paths will be scaled to fit. Preserves aspect ratio. ' +
    'Example: 50 for a 50px tall icon.',
} as const;

export const TraceBitmapToSvgSchema = z.object({
  input_path: z.string().min(1).describe(PARAM_DESCRIPTIONS.input_path),
  output_path: z.string().optional().describe(PARAM_DESCRIPTIONS.output_path),
  threshold: z.number().min(0).max(255).optional().describe(PARAM_DESCRIPTIONS.threshold),
  turd_size: z.number().min(0).optional().describe(PARAM_DESCRIPTIONS.turd_size),
  opt_tolerance: z.number().min(0).max(1).optional().describe(PARAM_DESCRIPTIONS.opt_tolerance),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{3,8}$/, 'Must be a valid hex color (e.g., "#FF5733", "#000")')
    .optional()
    .describe(PARAM_DESCRIPTIONS.color),
  background: z
    .union([
      z.literal('transparent'),
      z.string().regex(/^#[0-9A-Fa-f]{3,8}$/, 'Must be "transparent" or a valid hex color'),
    ])
    .optional()
    .describe(PARAM_DESCRIPTIONS.background),
  target_width: z.number().positive().optional().describe(PARAM_DESCRIPTIONS.target_width),
  target_height: z.number().positive().optional().describe(PARAM_DESCRIPTIONS.target_height),
});

const TOOL_DESCRIPTION = `Convert a bitmap image (PNG, JPG, BMP, etc.) to an SVG vector graphic using potrace tracing.

Reads a bitmap image from the filesystem, preprocesses it (handles transparency, converts to grayscale), and traces it to produce clean SVG vector paths.

**Returns:**
JSON object with:
- \`svg\`: The generated SVG markup string
- \`outputPath\`: Filesystem path where the SVG was written
- \`originalWidth\` / \`originalHeight\`: Source image dimensions
- \`preprocessed\`: Whether alpha-channel preprocessing was applied

**Use cases:**
- Convert a brand logo PNG to SVG for use as an icon
- Trace a favicon or app icon to vector format
- Convert any bitmap to scalable vector paths
- Generate 50x50 SVG icons from source images (use target_width and target_height)

**Notes:**
- Transparent PNGs are automatically preprocessed: alpha channel is converted to a black-on-white mask before tracing
- All common image formats are supported via the sharp library
- Output SVG contains vector paths that can be styled with CSS
- Use target_width/target_height to scale the output for icon-sized SVGs`;

export function traceBitmapToSvgTool(_server: Server) {
  return {
    name: 'trace_bitmap_to_svg',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        input_path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.input_path,
        },
        output_path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.output_path,
        },
        threshold: {
          type: 'number',
          minimum: 0,
          maximum: 255,
          description: PARAM_DESCRIPTIONS.threshold,
        },
        turd_size: {
          type: 'number',
          minimum: 0,
          description: PARAM_DESCRIPTIONS.turd_size,
        },
        opt_tolerance: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: PARAM_DESCRIPTIONS.opt_tolerance,
        },
        color: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.color,
        },
        background: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.background,
        },
        target_width: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.target_width,
        },
        target_height: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.target_height,
        },
      },
      required: ['input_path'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = TraceBitmapToSvgSchema.parse(args);

        // Derive output path if not specified
        const outputPath =
          validated.output_path ??
          (/\.[^.]+$/.test(validated.input_path)
            ? validated.input_path.replace(/\.[^.]+$/, '.svg')
            : validated.input_path + '.svg');

        const result = await traceToSvg(validated.input_path, outputPath, {
          threshold: validated.threshold,
          turdSize: validated.turd_size,
          optTolerance: validated.opt_tolerance,
          color: validated.color,
          background: validated.background,
          targetWidth: validated.target_width,
          targetHeight: validated.target_height,
        });

        const summary = {
          outputPath: result.outputPath,
          originalWidth: result.originalWidth,
          originalHeight: result.originalHeight,
          preprocessed: result.preprocessed,
          svgLength: result.svg.length,
          svg: result.svg,
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(summary, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error tracing bitmap to SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
