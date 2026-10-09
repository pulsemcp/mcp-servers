import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockGmailClient } from '../mocks/gmail-client.functional-mock.js';
import {
  buildMimeMessage,
  formatFilenameParams,
  toWrappedBase64,
} from '../../shared/src/gmail-client/lib/mime-utils.js';
import { sendMessage } from '../../shared/src/gmail-client/lib/send-message.js';
import { createDraft, updateDraft } from '../../shared/src/gmail-client/lib/drafts.js';
import { INLINE_RAW_LIMIT_BYTES } from '../../shared/src/gmail-client/lib/raw-message-request.js';
import {
  AttachmentsSchema,
  MAX_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_BYTES,
  guessMimeType,
  isDisallowedHost,
  resolveAttachments,
} from '../../shared/src/utils/attachments.js';
import { sendEmailTool } from '../../shared/src/tools/send-email.js';
import { upsertDraftEmailTool } from '../../shared/src/tools/draft-email.js';
import type { IGmailClient } from '../../shared/src/server.js';

const PDF_BYTES = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\nfake pdf body\n%%EOF', 'latin1');

function boundaryOf(message: string, type: string): string {
  const match = message.match(new RegExp(`Content-Type: ${type}; boundary="([^"]+)"`));
  if (!match) throw new Error(`no ${type} boundary in message`);
  return match[1];
}

/** Splits a multipart body into its parts (headers + body) using the boundary. */
function splitParts(message: string, boundary: string): string[] {
  const body = message.slice(message.indexOf(`--${boundary}\r\n`));
  expect(body.trimEnd().endsWith(`--${boundary}--`)).toBe(true);
  return body
    .split(`--${boundary}`)
    .slice(1, -1)
    .map((p) => p.replace(/^\r\n/, '').replace(/\r\n$/, ''));
}

function partBody(part: string): string {
  return part.slice(part.indexOf('\r\n\r\n') + 4);
}

describe('MIME attachments', () => {
  it('leaves messages without attachments unchanged (no multipart/mixed)', () => {
    const result = buildMimeMessage('sender@example.com', {
      to: 'recipient@example.com',
      subject: 'Hi',
      plaintextBody: 'Hello',
      attachments: [],
    });
    expect(result).not.toContain('multipart/mixed');
    expect(result).toContain('Content-Type: text/plain; charset=utf-8\r\n\r\nHello');
  });

  it('builds multipart/mixed with a text body part and a base64 attachment part', () => {
    const result = buildMimeMessage('sender@example.com', {
      to: 'recipient@example.com',
      subject: 'Statement',
      plaintextBody: 'See attached.',
      attachments: [{ filename: 'statement.pdf', mimeType: 'application/pdf', content: PDF_BYTES }],
    });

    const boundary = boundaryOf(result, 'multipart/mixed');
    // Top-level headers declare multipart/mixed, not a text type
    const topHeaders = result.slice(0, result.indexOf('\r\n\r\n'));
    expect(topHeaders).toContain('MIME-Version: 1.0');
    expect(topHeaders).toContain(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    expect(topHeaders).not.toContain('text/plain');

    const parts = splitParts(result, boundary);
    expect(parts).toHaveLength(2);

    expect(parts[0]).toContain('Content-Type: text/plain; charset=utf-8');
    expect(partBody(parts[0])).toBe('See attached.');

    expect(parts[1]).toContain('Content-Type: application/pdf; name="statement.pdf"');
    expect(parts[1]).toContain('Content-Disposition: attachment; filename="statement.pdf"');
    expect(parts[1]).toContain('Content-Transfer-Encoding: base64');
    const decoded = Buffer.from(partBody(parts[1]).replace(/\r\n/g, ''), 'base64');
    expect(decoded.equals(PDF_BYTES)).toBe(true);
  });

  it('nests multipart/alternative inside multipart/mixed when both bodies are given', () => {
    const result = buildMimeMessage('sender@example.com', {
      to: 'recipient@example.com',
      subject: 'Both',
      plaintextBody: 'plain',
      htmlBody: '<p>html</p>',
      attachments: [
        { filename: 'a.txt', mimeType: 'text/plain', content: Buffer.from('A') },
        { filename: 'b.csv', mimeType: 'text/csv', content: Buffer.from('x,y\n1,2') },
      ],
    });

    const mixed = boundaryOf(result, 'multipart/mixed');
    const alt = boundaryOf(result, 'multipart/alternative');
    expect(mixed).not.toBe(alt);

    const parts = splitParts(result, mixed);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toMatch(/^Content-Type: multipart\/alternative; boundary="/);
    const altParts = splitParts(partBody(parts[0]), alt);
    expect(altParts.map(partBody)).toEqual(['plain', '<p>html</p>']);
    expect(parts[1]).toContain('filename="a.txt"');
    expect(parts[2]).toContain('Content-Type: text/csv; charset=utf-8; name="b.csv"');
  });

  it('places an HTML-only body as the first part', () => {
    const result = buildMimeMessage('sender@example.com', {
      to: 'recipient@example.com',
      subject: 'HTML',
      htmlBody: '<b>hi</b>',
      attachments: [
        { filename: 'x.bin', mimeType: 'application/octet-stream', content: Buffer.alloc(3) },
      ],
    });
    const parts = splitParts(result, boundaryOf(result, 'multipart/mixed'));
    expect(parts[0]).toContain('Content-Type: text/html; charset=utf-8');
    expect(partBody(parts[0])).toBe('<b>hi</b>');
  });

  it('wraps base64 attachment content at 76 characters per line', () => {
    const wrapped = toWrappedBase64(Buffer.alloc(200, 7));
    const lines = wrapped.split('\r\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((l) => l.length <= 76)).toBe(true);
    expect(lines.slice(0, -1).every((l) => l.length === 76)).toBe(true);
    expect(Buffer.from(lines.join(''), 'base64').equals(Buffer.alloc(200, 7))).toBe(true);
  });

  it('encodes non-ASCII filenames as RFC 2047 encoded-words', () => {
    const word = `=?UTF-8?B?${Buffer.from('išrašas 2026.pdf').toString('base64')}?=`;
    expect(formatFilenameParams('išrašas 2026.pdf')).toEqual({
      name: `\r\n name="${word}"`,
      disposition: `\r\n filename="${word}"`,
    });
  });

  it('declares a UTF-8 charset on text attachments only', () => {
    const result = buildMimeMessage('sender@example.com', {
      to: 'recipient@example.com',
      subject: 'x',
      plaintextBody: 'b',
      attachments: [
        { filename: 'n.txt', mimeType: 'text/plain', content: Buffer.from('ščž') },
        { filename: 'p.pdf', mimeType: 'application/pdf', content: PDF_BYTES },
      ],
    });
    expect(result).toContain('Content-Type: text/plain; charset=utf-8; name="n.txt"');
    expect(result).toContain('Content-Type: application/pdf; name="p.pdf"');
  });

  it('folds long non-ASCII filenames into short encoded-words', () => {
    const longName = '統計'.repeat(100) + '.pdf';
    const result = buildMimeMessage('sender@example.com', {
      to: 'recipient@example.com',
      subject: 'x',
      plaintextBody: 'b',
      attachments: [{ filename: longName, mimeType: 'application/pdf', content: PDF_BYTES }],
    });
    const lines = result.split('\r\n');
    expect(Math.max(...lines.map((l) => l.length))).toBeLessThanOrEqual(78);
    const words = formatFilenameParams(longName).name.match(/=\?UTF-8\?B\?[^?]*\?=/g)!;
    expect(words.length).toBeGreaterThan(1);
    expect(words.every((w) => w.length <= 75)).toBe(true);
    const decoded = words
      .map((w) => Buffer.from(w.slice(10, -2), 'base64').toString('utf-8'))
      .join('');
    expect(decoded).toBe(longName);
  });

  it('strips characters that could break out of the header parameter', () => {
    const params = formatFilenameParams('evil"\r\nBcc: x@example.com.pdf');
    expect(params.disposition).not.toMatch(/[\r\n]/);
    expect(params.disposition).toBe(' filename="evil___Bcc: x@example.com.pdf"');
  });

  it('produces a message that sendMessage base64url-encodes and round-trips intact', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 'm1', threadId: 't1' }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);
    try {
      await sendMessage('https://gmail.example/v1/users/me', {}, 'me@example.com', {
        to: 'you@example.com',
        subject: 'x',
        plaintextBody: 'body',
        attachments: [{ filename: 'f.pdf', mimeType: 'application/pdf', content: PDF_BYTES }],
      });
      const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
      const raw = Buffer.from(body.raw, 'base64url').toString('utf-8');
      const parts = splitParts(raw, boundaryOf(raw, 'multipart/mixed'));
      const decoded = Buffer.from(partBody(parts[1]).replace(/\r\n/g, ''), 'base64');
      expect(decoded.equals(PDF_BYTES)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('Gmail request routing for large messages', () => {
  const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const big = Buffer.alloc(INLINE_RAW_LIMIT_BYTES, 1);
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockImplementation(
        async () => new Response(JSON.stringify({ id: 'x', threadId: 't' }), { status: 200 })
      );
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const opts = (threadId?: string) => ({
    to: 'you@example.com',
    subject: 's',
    plaintextBody: 'b',
    threadId,
    attachments: [{ filename: 'big.bin', mimeType: 'application/octet-stream', content: big }],
  });

  function parseUpload(call: unknown[]) {
    const init = call[1] as RequestInit & { headers: Record<string, string> };
    const boundary = init.headers['Content-Type'].match(/^multipart\/related; boundary=(.+)$/)![1];
    const [meta, media] = (init.body as string)
      .split(`--${boundary}`)
      .slice(1, -1)
      .map((p) => p.replace(/^\r\n/, '').replace(/\r\n$/, ''));
    expect(meta).toMatch(/^Content-Type: application\/json/);
    expect(media).toMatch(/^Content-Type: message\/rfc822\r\n\r\nFrom: me@example.com/);
    return { init, metadata: JSON.parse(partBody(meta)), media: partBody(media) };
  }

  it('keeps small messages on the inline JSON endpoint', async () => {
    await sendMessage(BASE, { 'Content-Type': 'application/json' }, 'me@example.com', {
      to: 'you@example.com',
      subject: 's',
      plaintextBody: 'b',
      threadId: 't1',
    });
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/messages/send`);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body)).toEqual(['raw', 'threadId']);
  });

  it('sends large messages through the multipart upload URI with threadId metadata', async () => {
    await sendMessage(BASE, { 'Content-Type': 'application/json' }, 'me@example.com', opts('t1'));
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://gmail.googleapis.com/upload/gmail/v1/users/me/messages/send?uploadType=multipart'
    );
    const { init, metadata, media } = parseUpload(fetchMock.mock.calls[0]);
    expect(init.method).toBe('POST');
    expect(metadata).toEqual({ threadId: 't1' });
    expect(media).toContain('Content-Type: multipart/mixed;');
  });

  it('creates and updates large drafts through the upload URI', async () => {
    await createDraft(BASE, {}, 'me@example.com', opts('t2'));
    await updateDraft(BASE, {}, 'me@example.com', 'd1', opts());
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://gmail.googleapis.com/upload/gmail/v1/users/me/drafts?uploadType=multipart'
    );
    expect(parseUpload(fetchMock.mock.calls[0]).metadata).toEqual({ message: { threadId: 't2' } });
    expect(fetchMock.mock.calls[1][0]).toBe(
      'https://gmail.googleapis.com/upload/gmail/v1/users/me/drafts/d1?uploadType=multipart'
    );
    expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
    expect(parseUpload(fetchMock.mock.calls[1]).metadata).toEqual({ message: {} });
  });
});

describe('Attachment input validation', () => {
  it('requires exactly one of content_base64 or url', () => {
    expect(AttachmentsSchema.safeParse([{ filename: 'a.txt' }]).success).toBe(false);
    expect(
      AttachmentsSchema.safeParse([
        { filename: 'a.txt', content_base64: 'QQ==', url: 'https://example.com/a.txt' },
      ]).success
    ).toBe(false);
    expect(
      AttachmentsSchema.safeParse([{ filename: 'a.txt', content_base64: 'QQ==' }]).success
    ).toBe(true);
  });

  it('requires filename with content_base64 but not with url', () => {
    expect(AttachmentsSchema.safeParse([{ content_base64: 'QQ==' }]).success).toBe(false);
    expect(AttachmentsSchema.safeParse([{ url: 'https://example.com/a.pdf' }]).success).toBe(true);
  });

  it('rejects non-https URLs and malformed MIME types', () => {
    expect(AttachmentsSchema.safeParse([{ url: 'http://example.com/a.pdf' }]).success).toBe(false);
    expect(AttachmentsSchema.safeParse([{ url: 'file:///etc/passwd' }]).success).toBe(false);
    expect(
      AttachmentsSchema.safeParse([
        { filename: 'a', content_base64: 'QQ==', mime_type: 'text/plain\r\nBcc: x' },
      ]).success
    ).toBe(false);
  });

  it(`rejects more than ${MAX_ATTACHMENTS} attachments`, () => {
    const many = Array.from({ length: MAX_ATTACHMENTS + 1 }, (_, i) => ({
      filename: `${i}.txt`,
      content_base64: 'QQ==',
    }));
    expect(AttachmentsSchema.safeParse(many).success).toBe(false);
  });

  it('flags loopback, private and link-local hosts', () => {
    for (const host of [
      'localhost',
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '100.100.1.1',
      '[::1]',
      'fd00::1',
      'metadata.google.internal',
      'localhost.',
      'metadata.google.internal.',
    ]) {
      expect(isDisallowedHost(host), host).toBe(true);
    }
    for (const host of ['storage.googleapis.com', '8.8.8.8', '172.32.0.1']) {
      expect(isDisallowedHost(host), host).toBe(false);
    }
  });

  it('guesses MIME types from extensions', () => {
    expect(guessMimeType('Statement.PDF')).toBe('application/pdf');
    expect(guessMimeType('noext')).toBe('application/octet-stream');
  });
});

describe('resolveAttachments', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns an empty list when there are no attachments', async () => {
    expect(await resolveAttachments(undefined)).toEqual([]);
  });

  it('decodes base64 content and infers MIME type from the filename', async () => {
    const [a] = await resolveAttachments([
      { filename: 'statement.pdf', content_base64: PDF_BYTES.toString('base64') },
    ]);
    expect(a.filename).toBe('statement.pdf');
    expect(a.mimeType).toBe('application/pdf');
    expect(a.content.equals(PDF_BYTES)).toBe(true);
  });

  it('accepts base64 with line breaks and honours an explicit mime_type', async () => {
    const wrapped = toWrappedBase64(Buffer.alloc(100, 1));
    const [a] = await resolveAttachments([
      { filename: 'data', content_base64: wrapped, mime_type: 'application/x-custom' },
    ]);
    expect(a.mimeType).toBe('application/x-custom');
    expect(a.content.equals(Buffer.alloc(100, 1))).toBe(true);
  });

  it('rejects invalid base64', async () => {
    await expect(
      resolveAttachments([{ filename: 'a.txt', content_base64: 'not base64!!' }])
    ).rejects.toThrow('not valid base64');
  });

  it('downloads URL attachments, using the response Content-Type and URL filename', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: URL) => {
      const res = new Response(PDF_BYTES, {
        status: 200,
        headers: { 'content-type': 'application/pdf; charset=binary' },
      });
      Object.defineProperty(res, 'url', { value: url.href });
      return res;
    });
    vi.stubGlobal('fetch', fetchMock);

    const [a] = await resolveAttachments([
      { url: 'https://storage.example.com/bucket/Sept%20statement.pdf?X-Goog-Signature=abc' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('X-Goog-Signature=abc');
    expect(a.filename).toBe('Sept statement.pdf');
    expect(a.mimeType).toBe('application/pdf');
    expect(a.content.equals(PDF_BYTES)).toBe(true);
  });

  it('falls back to an extension guess when the server returns a generic Content-Type', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(PDF_BYTES, { headers: { 'content-type': 'binary/octet-stream' } })
        )
    );
    const [a] = await resolveAttachments([
      { url: 'https://s3.example.com/x.pdf', filename: 'renamed.pdf' },
    ]);
    expect(a.filename).toBe('renamed.pdf');
    expect(a.mimeType).toBe('application/pdf');
  });

  it('surfaces HTTP errors without echoing the signed query string', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('denied', { status: 403 })));
    const err = await resolveAttachments([
      { url: 'https://storage.example.com/a.pdf?X-Goog-Signature=secret' },
    ]).catch((e: Error) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toContain('HTTP 403');
    expect((err as Error).message).not.toContain('secret');
  });

  it('refuses private-network URLs without fetching them', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      resolveAttachments([{ url: 'https://169.254.169.254/latest/meta-data' }])
    ).rejects.toThrow('not allowed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a redirect to a private-network location without requesting it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'https://127.0.0.1/secret' } })
      );
    vi.stubGlobal('fetch', fetchMock);
    await expect(resolveAttachments([{ url: 'https://example.com/a.pdf' }])).rejects.toThrow(
      'not allowed'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a redirect that downgrades to http', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response(null, { status: 301, headers: { location: 'http://example.com/a.pdf' } })
        )
    );
    await expect(resolveAttachments([{ url: 'https://example.com/a.pdf' }])).rejects.toThrow(
      'must use https'
    );
  });

  it('follows public redirects, resolving relative locations', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/files/real.pdf' } })
      )
      .mockResolvedValueOnce(new Response(PDF_BYTES, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const [a] = await resolveAttachments([{ url: 'https://example.com/short' }]);
    expect(String(fetchMock.mock.calls[1][0])).toBe('https://example.com/files/real.pdf');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('manual');
    expect(a.filename).toBe('real.pdf');
    expect(a.mimeType).toBe('application/pdf');
  });

  it('gives up after too many redirects', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(
          async () =>
            new Response(null, { status: 302, headers: { location: 'https://example.com/loop' } })
        )
    );
    await expect(resolveAttachments([{ url: 'https://example.com/loop' }])).rejects.toThrow(
      'redirected more than'
    );
  });

  it('rejects a download whose declared Content-Length exceeds the limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('small', {
          headers: { 'content-length': String(MAX_TOTAL_ATTACHMENT_BYTES + 1) },
        })
      )
    );
    await expect(resolveAttachments([{ url: 'https://example.com/big.pdf' }])).rejects.toThrow(
      'exceeds the remaining size limit'
    );
  });

  it('rejects a streamed download that grows past the limit', async () => {
    const chunk = new Uint8Array(1024 * 1024);
    let sent = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += chunk.length;
        controller.enqueue(chunk);
        if (sent > MAX_TOTAL_ATTACHMENT_BYTES + chunk.length) controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream)));
    await expect(resolveAttachments([{ url: 'https://example.com/big.pdf' }])).rejects.toThrow(
      'exceeds the remaining size limit'
    );
  });

  it('enforces the total size limit across attachments', async () => {
    const half = Buffer.alloc(MAX_TOTAL_ATTACHMENT_BYTES / 2 + 1).toString('base64');
    await expect(
      resolveAttachments([
        { filename: 'a.bin', content_base64: half },
        { filename: 'b.bin', content_base64: half },
      ])
    ).rejects.toThrow(/size limit/);
  });
});

describe('Tools with attachments', () => {
  let mockClient: IGmailClient;
  const mockServer = {} as Server;

  beforeEach(() => {
    mockClient = createMockGmailClient();
    process.env.ELICITATION_ENABLED = 'false';
  });

  it('send_email passes resolved attachments to the client and reports them', async () => {
    const tool = sendEmailTool(mockServer, () => mockClient);
    const result = await tool.handler({
      to: 'recipient@example.com',
      subject: 'Statement',
      plaintext_body: 'Attached.',
      attachments: [{ filename: 'statement.pdf', content_base64: PDF_BYTES.toString('base64') }],
    });

    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('**Attachments:** statement.pdf (application/pdf,');
    const call = (mockClient.sendMessage as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(call.attachments).toHaveLength(1);
    expect(call.attachments[0].content.equals(PDF_BYTES)).toBe(true);
  });

  it('send_email advertises the attachments parameter in its input schema', () => {
    const tool = sendEmailTool(mockServer, () => mockClient);
    expect(tool.inputSchema.properties.attachments.type).toBe('array');
  });

  it('send_email reports invalid attachments as an error and does not send', async () => {
    const tool = sendEmailTool(mockServer, () => mockClient);
    const result = await tool.handler({
      to: 'recipient@example.com',
      subject: 'Statement',
      plaintext_body: 'Attached.',
      attachments: [{ url: 'http://example.com/a.pdf' }],
    });
    expect(result.isError).toBe(true);
    expect(mockClient.sendMessage).not.toHaveBeenCalled();
  });

  it('send_email ignores attachments when sending a draft', async () => {
    await (mockClient.createDraft as ReturnType<typeof vi.fn>)({
      to: 'a@example.com',
      subject: 's',
      plaintextBody: 'b',
    });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    try {
      const tool = sendEmailTool(mockServer, () => mockClient);
      const result = await tool.handler({
        from_draft_id: 'draft_1',
        attachments: [{ url: 'https://example.com/a.pdf' }],
      });
      expect(result.content[0].text).toContain('Draft sent successfully');
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('upsert_draft_email passes attachments to createDraft and updateDraft', async () => {
    const tool = upsertDraftEmailTool(mockServer, () => mockClient);
    const attachments = [
      { filename: 'a.csv', content_base64: Buffer.from('x,y').toString('base64') },
    ];

    const created = await tool.handler({
      to: 'r@example.com',
      subject: 'Draft',
      plaintext_body: 'b',
      attachments,
    });
    expect(created.content[0].text).toContain('**Attachments:** a.csv (text/csv,');
    const createCall = (mockClient.createDraft as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(createCall.attachments[0].filename).toBe('a.csv');

    await tool.handler({
      draft_id: 'draft_1',
      to: 'r@example.com',
      subject: 'Draft',
      plaintext_body: 'b',
      attachments,
    });
    const updateCall = (mockClient.updateDraft as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(updateCall.attachments[0].mimeType).toBe('text/csv');
  });
});
