import { z } from 'zod';
import type { MimeAttachment } from '../gmail-client/lib/mime-utils.js';

/**
 * Limits for outgoing attachments. Gmail rejects messages over 25 MB, and
 * base64 transfer encoding inflates content by ~4/3, so the decoded total is
 * capped at 18 MB to keep the encoded message safely under that limit.
 */
export const MAX_ATTACHMENTS = 10;
export const MAX_TOTAL_ATTACHMENT_BYTES = 18 * 1024 * 1024;
export const ATTACHMENT_FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;

const MIME_TYPE_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_.+-]*$/;
const GENERIC_MIME_TYPES = new Set(['application/octet-stream', 'binary/octet-stream']);
const BASE64_PATTERN = /^[A-Za-z0-9+/]*={0,2}$/;

export const ATTACHMENTS_DESCRIPTION =
  'Files to attach (optional, max ' +
  `${MAX_ATTACHMENTS}, ${MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)} MB total decoded). ` +
  'Each item provides exactly one of: `url` — an HTTPS URL the server downloads ' +
  '(e.g. a signed artifact-store link; must be publicly fetchable without extra auth), or ' +
  '`content_base64` — the file bytes as standard base64. ' +
  '`filename` is required with content_base64 and defaults to the last URL path segment with url. ' +
  '`mime_type` defaults to the URL response Content-Type, then a guess from the filename extension, ' +
  'then application/octet-stream.';

export const AttachmentInputSchema = z
  .object({
    filename: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe('File name shown to the recipient, e.g. "statement-2026-09.pdf".'),
    mime_type: z
      .string()
      .regex(MIME_TYPE_PATTERN, 'mime_type must look like "type/subtype"')
      .optional()
      .describe('MIME type, e.g. "application/pdf".'),
    content_base64: z.string().min(1).optional().describe('File content as standard base64.'),
    url: z.string().url().optional().describe('HTTPS URL to download the file from.'),
  })
  .superRefine((data, ctx) => {
    if (Boolean(data.content_base64) === Boolean(data.url)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Each attachment must provide exactly one of content_base64 or url.',
      });
    }
    if (data.content_base64 && !data.filename) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'filename is required when an attachment is given as content_base64.',
      });
    }
    if (data.url && !data.url.toLowerCase().startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Attachment url must use https://.',
      });
    }
  });

export const AttachmentsSchema = z
  .array(AttachmentInputSchema)
  .max(MAX_ATTACHMENTS, `At most ${MAX_ATTACHMENTS} attachments are allowed.`)
  .optional()
  .describe(ATTACHMENTS_DESCRIPTION);

export type AttachmentInput = z.infer<typeof AttachmentInputSchema>;

/**
 * JSON Schema for the `attachments` tool parameter (mirrors AttachmentsSchema).
 */
export const ATTACHMENTS_JSON_SCHEMA = {
  type: 'array',
  description: ATTACHMENTS_DESCRIPTION,
  maxItems: MAX_ATTACHMENTS,
  items: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        maxLength: 255,
        description: 'File name shown to the recipient, e.g. "statement-2026-09.pdf".',
      },
      mime_type: {
        type: 'string',
        pattern: MIME_TYPE_PATTERN.source,
        description: 'MIME type, e.g. "application/pdf".',
      },
      content_base64: { type: 'string', description: 'File content as standard base64.' },
      url: { type: 'string', description: 'HTTPS URL to download the file from.' },
    },
    additionalProperties: false,
  },
} as const;

const EXTENSION_MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
  html: 'text/html',
  htm: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  zip: 'application/zip',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ics: 'text/calendar',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function guessMimeType(filename: string): string {
  const ext = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';
  return EXTENSION_MIME_TYPES[ext] ?? 'application/octet-stream';
}

function filenameFromUrl(url: URL): string {
  const lastSegment = url.pathname.split('/').filter(Boolean).pop();
  if (!lastSegment) {
    return 'attachment';
  }
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment;
  }
}

/**
 * Rejects hosts that point at the server's own machine or private networks,
 * so a URL attachment cannot be used to read internal services.
 * Only literal hosts are checked; DNS names are not resolved.
 */
export function isDisallowedHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.internal')) {
    return true;
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    );
  }
  if (host.includes(':')) {
    return (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80') ||
      host.startsWith('::ffff:')
    );
  }
  return false;
}

function decodeBase64(content: string, filename: string, limit: number): Buffer {
  const normalized = content.replace(/\s+/g, '');
  if (normalized.length % 4 !== 0 || !BASE64_PATTERN.test(normalized)) {
    throw new Error(`Attachment "${filename}": content_base64 is not valid base64.`);
  }
  // Check the decoded size before decoding so oversized input is never materialised.
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0;
  if ((normalized.length / 4) * 3 - padding > limit) {
    throw new Error(`Attachment "${filename}" exceeds the remaining size limit (${limit} bytes).`);
  }
  return Buffer.from(normalized, 'base64');
}

async function readBodyWithLimit(response: Response, limit: number, label: string) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) {
    throw new Error(`Attachment "${label}" exceeds the remaining size limit (${limit} bytes).`);
  }
  if (!response.body) {
    return Buffer.alloc(0);
  }
  const chunks: Buffer[] = [];
  let total = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error(`Attachment "${label}" exceeds the remaining size limit (${limit} bytes).`);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

function assertAllowedUrl(url: URL): void {
  if (url.protocol !== 'https:') {
    throw new Error(`Attachment url must use https:// (got ${url.protocol}).`);
  }
  if (isDisallowedHost(url.hostname)) {
    throw new Error(`Attachment url host "${url.hostname}" is not allowed.`);
  }
}

async function fetchAttachment(
  rawUrl: string,
  limit: number
): Promise<{ content: Buffer; contentType?: string; url: URL }> {
  let url = new URL(rawUrl);
  const signal = AbortSignal.timeout(ATTACHMENT_FETCH_TIMEOUT_MS);

  // Follow redirects by hand so every hop is checked before it is requested.
  let response: Response;
  for (let hop = 0; ; hop++) {
    assertAllowedUrl(url);
    response = await fetch(url, { redirect: 'manual', signal });
    const location = response.headers.get('location');
    if (response.status < 300 || response.status >= 400 || !location) {
      break;
    }
    if (hop >= MAX_REDIRECTS) {
      throw new Error(`Attachment url redirected more than ${MAX_REDIRECTS} times.`);
    }
    await response.body?.cancel();
    url = new URL(location, url);
  }

  if (!response.ok) {
    throw new Error(
      `Failed to download attachment from ${url.host}${url.pathname}: HTTP ${response.status}`
    );
  }

  const content = await readBodyWithLimit(response, limit, url.pathname);
  const contentType = response.headers.get('content-type')?.split(';')[0].trim();
  return { content, contentType, url };
}

/**
 * Resolves attachment inputs (base64 content or HTTPS URLs) into decoded
 * attachments, enforcing the total size limit across all of them.
 */
export async function resolveAttachments(
  inputs: AttachmentInput[] | undefined
): Promise<MimeAttachment[]> {
  if (!inputs || inputs.length === 0) {
    return [];
  }
  if (inputs.length > MAX_ATTACHMENTS) {
    throw new Error(`At most ${MAX_ATTACHMENTS} attachments are allowed.`);
  }

  const resolved: MimeAttachment[] = [];
  let totalBytes = 0;

  for (const input of inputs) {
    const remaining = MAX_TOTAL_ATTACHMENT_BYTES - totalBytes;
    let content: Buffer;
    let filename: string;
    let fetchedType: string | undefined;

    if (input.content_base64) {
      filename = input.filename!;
      content = decodeBase64(input.content_base64, filename, remaining);
    } else {
      const fetched = await fetchAttachment(input.url!, remaining);
      content = fetched.content;
      fetchedType = fetched.contentType;
      filename = input.filename ?? filenameFromUrl(fetched.url);
    }

    totalBytes += content.length;
    if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
      throw new Error(
        `Attachments exceed the ${MAX_TOTAL_ATTACHMENT_BYTES / (1024 * 1024)} MB total size limit.`
      );
    }

    // Generic types (common on object stores) fall through to an extension guess.
    const useFetchedType =
      fetchedType &&
      MIME_TYPE_PATTERN.test(fetchedType) &&
      !GENERIC_MIME_TYPES.has(fetchedType.toLowerCase());
    const mimeType = input.mime_type ?? (useFetchedType ? fetchedType! : guessMimeType(filename));

    resolved.push({ filename, mimeType, content });
  }

  return resolved;
}

/**
 * Human-readable summary of resolved attachments, e.g. "a.pdf (application/pdf, 12.3 KB)".
 */
export function formatAttachmentList(attachments: MimeAttachment[]): string {
  return attachments
    .map((a) => `${a.filename} (${a.mimeType}, ${(a.content.length / 1024).toFixed(1)} KB)`)
    .join(', ');
}
