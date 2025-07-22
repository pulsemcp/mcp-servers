import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import type { ClientFactory } from '../server.js';

// Parameter descriptions - single source of truth
const PARAM_DESCRIPTIONS = {
  post_slug: 'Slug of the post to attach the image to (e.g., "getting-started-mcp-servers")',
  file_name:
    'Name for the uploaded file, including extension (e.g., "hero-image.png", "diagram-1.jpg")',
  file_path:
    'Local file system path to the image file (e.g., "/Users/me/images/screenshot.png", "./assets/logo.jpg")',
} as const;

const UploadImageSchema = z.object({
  post_slug: z.string().describe(PARAM_DESCRIPTIONS.post_slug),
  file_name: z.string().describe(PARAM_DESCRIPTIONS.file_name),
  file_path: z.string().describe(PARAM_DESCRIPTIONS.file_path),
});

export function uploadImage(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'upload_image',
    description: `Upload an image file and attach it to a specific newsletter post. Images are stored in cloud storage organized by post, and the returned URL can be used in any of the post's image fields (image_url, preview_image_url, share_image).

Example response:
{
  "url": "https://cdn.pulsemcp.com/posts/getting-started-mcp-servers/hero-image.png",
  "size": 245678,
  "type": "image/png"
}

Supported formats:
- PNG (.png) - Best for screenshots and diagrams with text
- JPEG (.jpg, .jpeg) - Best for photographs and complex images
- GIF (.gif) - For simple animations
- WebP (.webp) - Modern format with better compression
- SVG (.svg) - For vector graphics and icons

File naming best practices:
- Use descriptive names: "mcp-architecture-diagram.png" not "image1.png"
- Include image purpose: "hero-", "preview-", "share-", "content-"
- Avoid spaces (use hyphens): "code-example-1.png" not "code example 1.png"

Use cases:
- Upload hero images for new newsletter posts
- Add diagrams and screenshots to illustrate technical concepts
- Upload preview images for post listings
- Create custom social sharing images for better engagement
- Replace outdated images with updated versions
- Add multiple content images for step-by-step tutorials`,
    inputSchema: {
      type: 'object',
      properties: {
        post_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.post_slug,
        },
        file_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.file_name,
        },
        file_path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.file_path,
        },
      },
      required: ['post_slug', 'file_name', 'file_path'],
    },
    handler: async (args: unknown) => {
      const validatedArgs = UploadImageSchema.parse(args);
      const client = clientFactory();

      try {
        // Read the file from disk
        let fileData: Buffer;
        try {
          fileData = await readFile(validatedArgs.file_path);
        } catch (error) {
          throw new Error(
            `Failed to read file at ${validatedArgs.file_path}: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        // Upload the image
        const response = await client.uploadImage(
          validatedArgs.post_slug,
          validatedArgs.file_name,
          fileData
        );

        // Format the response for MCP
        let content = `Successfully uploaded image!\n\n`;
        content += `**File Name:** ${validatedArgs.file_name}\n`;
        content += `**Post Slug:** ${validatedArgs.post_slug}\n`;
        content += `**URL:** ${response.url}\n\n`;
        content += `The image has been uploaded and is now available at the URL above. `;
        content += `You can use this URL in the post's image_url, preview_image_url, or share_image fields.`;

        return {
          content: [
            {
              type: 'text',
              text: content,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error uploading image: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
