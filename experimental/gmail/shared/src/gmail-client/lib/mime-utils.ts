/**
 * MIME message utilities for building and encoding email messages
 */

export interface MimeMessageOptions {
  to: string;
  subject: string;
  body: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
}

/**
 * Builds a MIME message from email options
 */
export function buildMimeMessage(from: string, options: MimeMessageOptions): string {
  const headers: string[] = [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
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

  return headers.join('\r\n') + '\r\n\r\n' + options.body;
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
