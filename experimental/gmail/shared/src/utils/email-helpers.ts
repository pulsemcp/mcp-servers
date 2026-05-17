import type { Email } from '../types.js';

/**
 * Extracts a header value from an email by header name (case-insensitive)
 */
export function getHeader(email: Email, headerName: string): string | undefined {
  return email.payload?.headers?.find((h) => h.name.toLowerCase() === headerName.toLowerCase())
    ?.value;
}

/**
 * Builds an account-scoped Gmail web URL for a given message.
 *
 * Uses the `/mail/u/<account-email>/#inbox/<messageId>` path form so the link
 * opens in the correct mailbox regardless of which accounts the reader is
 * signed into in their browser. The user-INDEX form `/mail/u/0/` would
 * otherwise open whichever account happens to be at index 0 in the reader's
 * browser session, which is rarely the impersonated/OAuth account this
 * server reads from.
 *
 * Gmail also accepts `?authuser=<email>` as a query-parameter fallback.
 */
export function buildGmailUrl(accountEmail: string, messageId: string): string {
  return `https://mail.google.com/mail/u/${encodeURIComponent(accountEmail)}/#inbox/${messageId}`;
}

/**
 * Formats an email for display in tool output.
 *
 * When `accountEmail` is provided, an account-scoped Gmail web URL is
 * appended so the user can click through to the correct mailbox.
 */
export function formatEmail(email: Email, accountEmail?: string): string {
  const subject = getHeader(email, 'Subject') || '(No Subject)';
  const from = getHeader(email, 'From') || 'Unknown';
  const date = getHeader(email, 'Date') || 'Unknown date';
  const snippet = email.snippet || '';

  let output = `**ID:** ${email.id}
**Thread ID:** ${email.threadId}
**Subject:** ${subject}
**From:** ${from}
**Date:** ${date}
**Preview:** ${snippet}`;

  if (accountEmail) {
    output += `\n**Gmail URL:** ${buildGmailUrl(accountEmail, email.id)}`;
  }

  return output;
}
