import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { parseDocumentId } from '../utils/parse-document-id.js';
import { logError } from '../logging.js';

const PARAM_DESCRIPTIONS = {
  document_id: 'The Google Docs document ID, or the full document URL. Both forms are accepted.',
  type:
    'Permission grantee type: "user" (specific email), "group" (Google group), ' +
    '"domain" (everyone in a Workspace domain), or "anyone" (anyone with the link).',
  role: 'Permission level: "reader" (view), "commenter" (view + comment), or "writer" (full edit).',
  email_address:
    'The email address of the user or group. Required when type="user" or type="group".',
  domain: 'The Workspace domain. Required when type="domain".',
  send_notification_email:
    'Whether Google should email a sharing notification to the grantee. Defaults ' +
    "to Google's server-side default (true for user/group). Set to false to " +
    'share silently — useful for automated flows where the user already knows ' +
    'about the doc.',
} as const;

export const ShareDocumentSchema = z
  .object({
    document_id: z.string().min(1).describe(PARAM_DESCRIPTIONS.document_id),
    type: z.enum(['user', 'group', 'domain', 'anyone']).describe(PARAM_DESCRIPTIONS.type),
    role: z.enum(['reader', 'commenter', 'writer']).describe(PARAM_DESCRIPTIONS.role),
    email_address: z.string().email().optional().describe(PARAM_DESCRIPTIONS.email_address),
    domain: z.string().optional().describe(PARAM_DESCRIPTIONS.domain),
    send_notification_email: z
      .boolean()
      .optional()
      .describe(PARAM_DESCRIPTIONS.send_notification_email),
  })
  .superRefine((data, ctx) => {
    if ((data.type === 'user' || data.type === 'group') && !data.email_address) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'email_address is required when type is "user" or "group"',
        path: ['email_address'],
      });
    }
    if (data.type === 'domain' && !data.domain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'domain is required when type is "domain"',
        path: ['domain'],
      });
    }
  });

const TOOL_DESCRIPTION = `Share a Google Doc with a user, group, domain, or anyone with the link.

Creates a Drive permission on the document. This is the most sensitive
write operation in this server — it grants third parties access to a file.
Only available in the "readwrite_external" tool group.

**Parameters:**
- document_id: Document ID or full Docs URL (required)
- type: "user" | "group" | "domain" | "anyone" (required)
- role: "reader" | "commenter" | "writer" (required)
- email_address: Required when type is "user" or "group"
- domain: Required when type is "domain"
- send_notification_email: Whether to send a sharing notification email (optional)

**Returns:**
The created permission's ID and grant details.

**Caveats:**
- The auth principal must have ownership/manager rights on the document.
- type="anyone" creates a public link — handle with care.`;

export function shareDocumentTool(_server: Server, clientFactory: ClientFactory) {
  return {
    name: 'share_document',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        document_id: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.document_id,
        },
        type: {
          type: 'string',
          enum: ['user', 'group', 'domain', 'anyone'],
          description: PARAM_DESCRIPTIONS.type,
        },
        role: {
          type: 'string',
          enum: ['reader', 'commenter', 'writer'],
          description: PARAM_DESCRIPTIONS.role,
        },
        email_address: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.email_address,
        },
        domain: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.domain,
        },
        send_notification_email: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.send_notification_email,
        },
      },
      required: ['document_id', 'type', 'role'],
    },
    handler: async (args: unknown) => {
      try {
        const parsed = ShareDocumentSchema.parse(args ?? {});
        const documentId = parseDocumentId(parsed.document_id);
        const client = clientFactory();

        // Google rejects sendNotificationEmail=true for type=anyone/domain — those
        // grantees have no email address to notify. Default to false in those cases
        // so the request succeeds without the caller having to know this rule.
        const sendNotificationEmail =
          parsed.send_notification_email ??
          (parsed.type === 'anyone' || parsed.type === 'domain' ? false : undefined);

        const permission = await client.createPermission(documentId, {
          type: parsed.type,
          role: parsed.role,
          emailAddress: parsed.email_address,
          domain: parsed.domain,
          sendNotificationEmail,
        });

        let output = `# Document Shared\n\n`;
        output += `**Document ID:** ${documentId}\n`;
        output += `**Permission ID:** ${permission.id || '(unknown)'}\n`;
        output += `**Type:** ${parsed.type}\n`;
        output += `**Role:** ${parsed.role}\n`;
        if (parsed.email_address) output += `**Email:** ${parsed.email_address}\n`;
        if (parsed.domain) output += `**Domain:** ${parsed.domain}\n`;
        if (sendNotificationEmail !== undefined) {
          output += `**Send notification email:** ${sendNotificationEmail}\n`;
        }
        output += `\n**URL:** https://docs.google.com/document/d/${documentId}/edit`;

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        logError('share-document-tool', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error sharing document: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
