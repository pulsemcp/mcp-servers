import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  file_id:
    'The Slack file ID (e.g., "F1234567890"). ' +
    'File IDs are shown in message outputs next to uploaded files.',
} as const;

export const DownloadFileSchema = z.object({
  file_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.file_id),
});

const TOOL_DESCRIPTION = `Download a file from Slack to a local temporary path.

Slack files require authentication to access, so this tool handles the download using the bot token. It saves the file to a temporary directory and returns the local file path.

**Returns:**
- Local file path (file:// URI) where the downloaded file was saved
- File metadata: name, type, size

**Use cases:**
- Download images shared in Slack to view them
- Download documents, PDFs, or other files shared in channels
- Access any file attachment from a Slack message

**Note:** File IDs (e.g., "F1234567890") are shown in message outputs from slack_get_channel and slack_get_thread.`;

export function downloadFileTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'slack_download_file',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        file_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.file_id,
        },
      },
      required: ['file_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = DownloadFileSchema.parse(args);
        const client = clientFactory();

        // Get file metadata
        const fileInfo = await client.getFileInfo(parsed.file_id);

        const downloadUrl = fileInfo.url_private_download || fileInfo.url_private;
        if (!downloadUrl) {
          return {
            content: [
              {
                type: 'text',
                text: `File ${parsed.file_id} has no downloadable URL. It may have been deleted or is not accessible.`,
              },
            ],
            isError: true,
          };
        }

        // Download the file
        const fileBuffer = await client.downloadFile(downloadUrl);

        // Write to temp directory
        const slackTmpDir = join(tmpdir(), 'slack-files');
        await mkdir(slackTmpDir, { recursive: true });

        const fileName = fileInfo.name || fileInfo.title || parsed.file_id;
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const localPath = join(slackTmpDir, `${parsed.file_id}-${safeName}`);

        await writeFile(localPath, fileBuffer);

        const sizeParts = [];
        if (fileInfo.mimetype) sizeParts.push(fileInfo.mimetype);
        if (fileInfo.size) sizeParts.push(formatFileSize(fileInfo.size));

        let output = `File downloaded successfully.\n`;
        output += `Name: ${fileName}\n`;
        if (sizeParts.length > 0) output += `Type: ${sizeParts.join(', ')}\n`;
        output += `Path: file://${localPath}\n`;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error downloading file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
