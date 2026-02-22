import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IAgentOrchestratorClient } from '../orchestrator-client/orchestrator-client.js';

export const GetTranscriptArchiveSchema = z.object({});

const TOOL_DESCRIPTION = `Get the download URL and curl command for the transcript archive zip file.

Returns the download URL, a ready-to-use curl command, and archive metadata (generation time, session count, file size). The archive is built incrementally every 10 minutes and contains all session transcripts.

**Use cases:**
- Download all session transcripts as a zip archive for backup or analysis
- Get archive metadata to check when it was last generated and how many sessions it contains`;

export function getTranscriptArchiveTool(
  _server: Server,
  clientFactory: () => IAgentOrchestratorClient
) {
  return {
    name: 'get_transcript_archive',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
    handler: async (_args: unknown) => {
      try {
        const client = clientFactory();

        const status = await client.getTranscriptArchiveStatus();
        const downloadInfo = client.getTranscriptArchiveDownloadUrl();

        const lines = [
          '## Transcript Archive',
          '',
          `- **Generated At:** ${status.generated_at}`,
          `- **Session Count:** ${status.session_count}`,
          `- **File Size:** ${formatFileSize(status.file_size_bytes)}`,
          '',
          '### Download',
          '',
          `**URL:** \`${downloadInfo.url}\``,
          '',
          'To download, run:',
          '```bash',
          `curl -o /path/to/transcript-archive.zip -H "X-API-Key: ${downloadInfo.apiKey}" "${downloadInfo.url}"`,
          '```',
        ];

        return { content: [{ type: 'text', text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting transcript archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
