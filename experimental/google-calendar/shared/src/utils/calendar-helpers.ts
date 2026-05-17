/**
 * Builds a universal Google Calendar event URL on `calendar.google.com`.
 *
 * The eid embedded in `htmlLink` already encodes the calendar context — it
 * base64-decodes to `<event-id> <calendar-id>`, so `calendar.google.com`
 * can route the click to the correct calendar regardless of which Google
 * accounts the reader is signed into.
 *
 * The raw `htmlLink` from Google's API uses `www.google.com` and redirects
 * through Google's general router, which can guess wrong when the reader
 * is signed into multiple accounts. Pointing directly at `calendar.google.com`
 * with the same eid bypasses that redirect.
 *
 * Falls back to the original `htmlLink` if it cannot be parsed (e.g. the
 * API response omitted `htmlLink` or it lacks an `eid` parameter), and
 * returns `undefined` if `htmlLink` is missing entirely.
 */
export function buildCalendarEventUrl(htmlLink: string | undefined): string | undefined {
  if (!htmlLink) {
    return undefined;
  }

  const eid = extractEid(htmlLink);
  if (!eid) {
    return htmlLink;
  }

  return `https://calendar.google.com/calendar/event?eid=${eid}`;
}

function extractEid(htmlLink: string): string | undefined {
  try {
    const url = new URL(htmlLink);
    return url.searchParams.get('eid') ?? undefined;
  } catch {
    return undefined;
  }
}
