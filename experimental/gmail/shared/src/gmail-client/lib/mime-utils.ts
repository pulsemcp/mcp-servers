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

/**
 * Builds a MIME message from email options.
 * If both plaintextBody and htmlBody are provided, creates a multipart/alternative message.
 * If only one is provided, creates a single-part message with the appropriate content type.
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

  // If both plain text and HTML are provided, use multipart/alternative
  if (options.plaintextBody && options.htmlBody) {
    const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);

    const plainBody = stripLeadingNewlines(options.plaintextBody);
    const htmlBody = stripLeadingNewlines(options.htmlBody);

    const parts = [
      `--${boundary}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${plainBody}`,
      `--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlBody}`,
      `--${boundary}--`,
    ];

    return headers.join('\r\n') + '\r\n\r\n' + parts.join('\r\n');
  }

  // Single content type
  if (options.htmlBody) {
    headers.push('Content-Type: text/html; charset=utf-8');
    return headers.join('\r\n') + '\r\n\r\n' + stripLeadingNewlines(options.htmlBody);
  }

  headers.push('Content-Type: text/plain; charset=utf-8');
  return headers.join('\r\n') + '\r\n\r\n' + stripLeadingNewlines(options.plaintextBody ?? '');
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
