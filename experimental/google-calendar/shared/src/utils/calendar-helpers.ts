/**
 * Builds a multi-account-robust Google Calendar event URL on `calendar.google.com`.
 *
 * Emits `https://calendar.google.com/calendar/event?eid=<eid>&authuser=<accountEmail>`
 * when `accountEmail` is non-empty. The `authuser` query parameter forces Google
 * Calendar to evaluate the link against the named account regardless of which
 * Google account is the reader's browser default — without it, multi-account
 * readers whose default account isn't the calendar owner get a 404.
 *
 * Falls back to `https://calendar.google.com/calendar/event?eid=<eid>` (bare form)
 * when `accountEmail` is empty/undefined. The bare form works for single-account
 * readers, and the eid itself base64-decodes to `<event-id> <calendar-id>` so the
 * calendar context still travels with the URL.
 *
 * NEVER emits the `/calendar/u/<email>/r/eventedit/<eid>` path form — that
 * reader-side path-based account selector 404s for any reader not currently
 * signed in as `<email>` (shipped and reverted as v0.0.9; see PR #3670 follow-up).
 *
 * Falls back to the original `htmlLink` if it cannot be parsed (e.g. the API
 * response omitted `htmlLink` or it lacks an `eid` parameter), and returns
 * `undefined` if `htmlLink` is missing entirely.
 */
export function buildCalendarEventUrl(
  htmlLink: string | undefined,
  accountEmail?: string
): string | undefined {
  if (!htmlLink) {
    return undefined;
  }

  const eid = extractEid(htmlLink);
  if (!eid) {
    return htmlLink;
  }

  const base = `https://calendar.google.com/calendar/event?eid=${eid}`;
  if (accountEmail && accountEmail.length > 0) {
    return `${base}&authuser=${encodeURIComponent(accountEmail)}`;
  }
  return base;
}

function extractEid(htmlLink: string): string | undefined {
  try {
    const url = new URL(htmlLink);
    return url.searchParams.get('eid') ?? undefined;
  } catch {
    return undefined;
  }
}
