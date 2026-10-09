/**
 * MIME message utilities for building and encoding email messages
 */

export interface MimeMessageOptions {
  to: string;
  subject: string;
  plaintextBody?: string;
  htmlBody?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: MimeAttachment[];
}

/**
 * A file attached to an outgoing message. Content is the raw (decoded) bytes.
 */
export interface MimeAttachment {
  filename: string;
  mimeType: string;
  content: Buffer;
}

/**
 * Encodes a string as an RFC 2047 encoded-word using UTF-8 and Base64.
 * Only encodes if the string contains non-ASCII characters.
 *
 * Note: RFC 2047 limits encoded-words to 75 characters. Very long non-ASCII
 * subjects should technically be split into multiple encoded-words separated
 * by folding whitespace. In practice, Gmail handles oversized encoded-words
 * correctly, so we encode as a single word for simplicity.
 */
export function encodeSubject(subject: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(subject)) {
    return subject;
  }
  const encoded = Buffer.from(subject, 'utf-8').toString('base64');
  return `=?UTF-8?B?${encoded}?=`;
}

/**
 * Strips leading newline characters (\r\n, \n, and bare \r) from email body content.
 * Prevents extra blank lines at the top of the email when displayed in Gmail.
 */
function stripLeadingNewlines(body: string): string {
  return body.replace(/^[\r\n]+/, '');
}

function generateBoundary(tag: string): string {
  return `${tag}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * Builds the body entity (headers + content) for the message text.
 * If both plaintextBody and htmlBody are provided, creates a multipart/alternative entity.
 * If only one is provided, creates a single-part entity with the appropriate content type.
 */
function buildBodyEntity(options: MimeMessageOptions): { headers: string[]; body: string } {
  if (options.plaintextBody && options.htmlBody) {
    const boundary = generateBoundary('boundary');
    const plainBody = stripLeadingNewlines(options.plaintextBody);
    const htmlBody = stripLeadingNewlines(options.htmlBody);

    const parts = [
      `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${plainBody}`,
      `--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlBody}`,
      `--${boundary}--`,
    ];

    return {
      headers: [`Content-Type: multipart/alternative; boundary="${boundary}"`],
      body: parts.join('\r\n'),
    };
  }

  if (options.htmlBody) {
    return {
      headers: ['Content-Type: text/html; charset=utf-8'],
      body: stripLeadingNewlines(options.htmlBody),
    };
  }

  return {
    headers: ['Content-Type: text/plain; charset=utf-8'],
    body: stripLeadingNewlines(options.plaintextBody ?? ''),
  };
}

/**
 * Removes characters that would break a quoted MIME header parameter
 * (CR/LF, other control characters, double quotes and backslashes).
 */
function sanitizeHeaderParam(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F"\\]/g, '_');
}

/**
 * Encodes a non-ASCII value as a sequence of RFC 2047 encoded-words, each at
 * most 75 characters, separated by folding whitespace so no header line
 * exceeds the RFC 5322 length limit. Splits only on character boundaries.
 */
function encodeWordsFolded(value: string): string {
  const words: string[] = [];
  let chunk = '';
  for (const char of value) {
    // 39 UTF-8 bytes -> 52 base64 chars + 12 chars of "=?UTF-8?B?...?=" framing, so a
    // folded line like ` filename="<word>";` stays within 78 characters
    if (Buffer.byteLength(chunk + char, 'utf-8') > 39) {
      words.push(chunk);
      chunk = '';
    }
    chunk += char;
  }
  if (chunk) words.push(chunk);
  return words
    .map((w) => `=?UTF-8?B?${Buffer.from(w, 'utf-8').toString('base64')}?=`)
    .join('\r\n ');
}

/**
 * Formats the filename parameters for an attachment's Content-Type and
 * Content-Disposition headers. Non-ASCII names are sent as RFC 2047
 * encoded-words inside the quoted parameter — the form Gmail itself emits and
 * the one mail clients most reliably decode. Each value includes its leading
 * whitespace (a space, or a fold for encoded names) so it follows a `;` directly.
 */
export function formatFilenameParams(filename: string): { name: string; disposition: string } {
  const safe = sanitizeHeaderParam(filename);
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(safe)) {
    return { name: ` name="${safe}"`, disposition: ` filename="${safe}"` };
  }
  // Start encoded names on their own folded line to keep header lines short.
  const encoded = encodeWordsFolded(safe);
  return { name: `\r\n name="${encoded}"`, disposition: `\r\n filename="${encoded}"` };
}

/**
 * Builds the Content-Type header value for an attachment. Text types get an
 * explicit UTF-8 charset so non-ASCII content is not read as US-ASCII.
 */
function attachmentContentType(mimeType: string): string {
  return mimeType.toLowerCase().startsWith('text/') && !/;\s*charset=/i.test(mimeType)
    ? `${mimeType}; charset=utf-8`
    : mimeType;
}

/**
 * Base64-encodes binary content, wrapped at 76 characters per line (RFC 2045).
 */
export function toWrappedBase64(content: Buffer): string {
  const encoded = content.toString('base64');
  return encoded.replace(/.{1,76}/g, (line) => line + '\r\n').replace(/\r\n$/, '');
}

/**
 * Builds a MIME message from email options.
 * Without attachments, the message is the body entity (plain text, HTML, or
 * multipart/alternative when both are given). With attachments, the message is
 * multipart/mixed: the body entity first, then one base64-encoded part per attachment.
 */
export function buildMimeMessage(from: string, options: MimeMessageOptions): string {
  const headers: string[] = [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${encodeSubject(options.subject)}`,
    'MIME-Version: 1.0',
  ];

  if (options.cc) {
    headers.push(`Cc: ${options.cc}`);
  }

  if (options.bcc) {
    headers.push(`Bcc: ${options.bcc}`);
  }

  if (options.inReplyTo) {
    headers.push(`In-Reply-To: ${options.inReplyTo}`);
  }

  if (options.references) {
    headers.push(`References: ${options.references}`);
  }

  const bodyEntity = buildBodyEntity(options);

  if (!options.attachments || options.attachments.length === 0) {
    return [...headers, ...bodyEntity.headers].join('\r\n') + '\r\n\r\n' + bodyEntity.body;
  }

  const boundary = generateBoundary('mixed');
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const parts = [`--${boundary}\r\n${bodyEntity.headers.join('\r\n')}\r\n\r\n${bodyEntity.body}`];

  for (const attachment of options.attachments) {
    const params = formatFilenameParams(attachment.filename);
    parts.push(
      `--${boundary}\r\n` +
        `Content-Type: ${attachmentContentType(attachment.mimeType)};${params.name}\r\n` +
        `Content-Disposition: attachment;${params.disposition}\r\n` +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        toWrappedBase64(attachment.content)
    );
  }

  parts.push(`--${boundary}--`);

  return headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
}

/**
 * Converts a string to base64url encoding (RFC 4648)
 */
export function toBase64Url(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
