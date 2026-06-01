import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import type { DriveComment, DriveCommentReply } from '../types.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  include_resolved:
    'Whether to include resolved (closed) comment threads. Default true. ' +
    'Set false to only see open/unresolved comments.',
  include_deleted: 'Whether to include deleted comments. Default false.',
} as const;

export const ListCommentsSchema = z.object({
  document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
  include_resolved: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_resolved),
  include_deleted: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_deleted),
});

const TOOL_DESCRIPTION = `List the comments on a Google Doc, including replies and resolved state.

Reads the Drive \`comments.list\` API. Returns each comment's author, timestamp,
resolved/open state, the anchored quoted text (the document text the comment
refers to), the comment body, and any threaded replies (including replies that
resolved or reopened the thread).

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- include_resolved: Include resolved threads (default true)
- include_deleted: Include deleted comments (default false)

**Requires the \`drive\` scope** — the narrower \`drive.file\` scope alone cannot
read comments on a document this app did not create.`;

function formatAuthor(author?: DriveComment['author']): string {
  if (!author) return 'Unknown';
  const name = author.displayName || 'Unknown';
  return author.emailAddress ? `${name} <${author.emailAddress}>` : name;
}

function formatReply(reply: DriveCommentReply, index: number): string {
  let out = `  ${index}. **${formatAuthor(reply.author)}**`;
  if (reply.createdTime) out += ` (${reply.createdTime})`;
  if (reply.action) out += ` _[${reply.action}]_`;
  if (reply.deleted) out += ' _[deleted]_';
  out += '\n';
  const content = reply.content?.trim();
  if (content) {
    out += `     ${content.replace(/\n/g, '\n     ')}\n`;
  }
  return out;
}

function formatComment(comment: DriveComment, index: number): string {
  let out = `### ${index}. ${formatAuthor(comment.author)}`;
  out += comment.resolved ? ' — ✅ resolved' : ' — 🗨️ open';
  if (comment.deleted) out += ' — 🗑️ deleted';
  out += '\n\n';
  if (comment.id) out += `- **Comment ID:** ${comment.id}\n`;
  if (comment.createdTime) out += `- **Created:** ${comment.createdTime}\n`;
  if (comment.modifiedTime && comment.modifiedTime !== comment.createdTime) {
    out += `- **Modified:** ${comment.modifiedTime}\n`;
  }
  const quoted = comment.quotedFileContent?.value?.trim();
  if (quoted) {
    out += `- **Anchored to:** "${quoted}"\n`;
  }
  out += '\n';

  const content = comment.content?.trim();
  out += content ? `${content}\n` : '_(no comment text)_\n';

  const replies = comment.replies ?? [];
  if (replies.length > 0) {
    out += `\n**Replies (${replies.length}):**\n\n`;
    replies.forEach((reply, i) => {
      out += formatReply(reply, i + 1);
    });
  }
  return out;
}

export function listCommentsTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'list_comments',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        include_resolved: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_resolved,
        },
        include_deleted: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.include_deleted,
        },
      },
      required: ['document_id'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ListCommentsSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const includeResolved = parsed.include_resolved ?? true;
        const client = clientFactory();

        const { comments, truncated } = await client.listComments(documentId, {
          includeDeleted: parsed.include_deleted ?? false,
        });

        const visible = includeResolved ? comments : comments.filter((c) => !c.resolved);

        const truncationNote = truncated
          ? '\n\n> ⚠️ This document has more comments than could be fetched; ' +
            'the list below is partial.'
          : '';

        let output = `# Comments on ${documentId}\n\n`;
        if (visible.length === 0) {
          output +=
            comments.length === 0
              ? 'No comments found on this document.'
              : 'No open comments (all comments are resolved). ' +
                'Pass include_resolved=true to see resolved threads.';
          return { content: [{ type: 'text', text: output + truncationNote }] };
        }

        const resolvedCount = visible.filter((c) => c.resolved).length;
        output += `**${visible.length} comment(s)`;
        if (resolvedCount > 0) {
          output += ` — ${resolvedCount} resolved, ${visible.length - resolvedCount} open`;
        }
        output += '**\n\n';

        visible.forEach((comment, i) => {
          output += formatComment(comment, i + 1);
          output += '\n';
        });

        return {
          content: [{ type: 'text', text: (output + truncationNote).trimEnd() }],
        };
      } catch (error) {
        logError('list-comments-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing comments: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
