/**
 * Builds an account-scoped Google Calendar event URL.
 *
 * Uses the `/calendar/u/<account-email>/r/eventedit/<eid>` path form so the
 * link opens in the correct account regardless of which Google accounts the
 * reader is signed into in their browser. The default `htmlLink` returned by
 * the Calendar API (`https://www.google.com/calendar/event?eid=...`) carries
 * no account context, so Google's web UI guesses based on the reader's
 * browser session and 404s when the guess is wrong.
 *
 * The `<eid>` segment is the opaque base64-style identifier from the
 * `?eid=...` query parameter on `htmlLink` — NOT the raw `event.id`. Using
 * the raw event id (e.g. `p1qvrkvfpl6d3a4rr6careb3bk`) yields a 500 page.
 *
 * Falls back to the original `htmlLink` if the input cannot be parsed (e.g.
 * the API response omitted `htmlLink` or it lacks an `eid` parameter).
 */
export function buildCalendarEventUrl(
  accountEmail: string,
  htmlLink: string | undefined
): string | undefined {
  if (!htmlLink) {
    return undefined;
  }

  const eid = extractEid(htmlLink);
  if (!eid) {
    return htmlLink;
  }

  return `https://calendar.google.com/calendar/u/${encodeURIComponent(accountEmail)}/r/eventedit/${eid}`;
}

function extractEid(htmlLink: string): string | undefined {
  try {
    const url = new URL(htmlLink);
    return url.searchParams.get('eid') ?? undefined;
  } catch {
    return undefined;
  }
}
