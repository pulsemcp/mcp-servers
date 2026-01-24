import type { Email } from '../types.js';

/**
 * Extracts a header value from an email by header name (case-insensitive)
 */
export function getHeader(email: Email, headerName: string): string | undefined {
  return email.payload?.headers?.find((h) => h.name.toLowerCase() === headerName.toLowerCase())
    ?.value;
}

/**
 * Formats an email for display in tool output
 */
export function formatEmail(email: Email): string {
  const subject = getHeader(email, 'Subject') || '(No Subject)';
  const from = getHeader(email, 'From') || 'Unknown';
  const date = getHeader(email, 'Date') || 'Unknown date';
  const snippet = email.snippet || '';

  return `**ID:** ${email.id}
**Thread ID:** ${email.threadId}
**Subject:** ${subject}
**From:** ${from}
**Date:** ${date}
**Preview:** ${snippet}`;
}
