/**
 * Default field and expansion parameters for X API v2 requests.
 *
 * X returns only a tweet id and text unless you explicitly request more via
 * `tweet.fields`, `user.fields`, and `expansions`. We centralize a sensible
 * read-only default set here so every list/lookup tool returns consistent,
 * useful data (author, timestamps, engagement metrics, referenced tweets, and
 * full text for long "note" tweets).
 */

export const TWEET_FIELDS = [
  'created_at',
  'author_id',
  'conversation_id',
  'in_reply_to_user_id',
  'lang',
  'public_metrics',
  'referenced_tweets',
  'note_tweet',
  'entities',
].join(',');

export const USER_FIELDS = ['created_at', 'description', 'verified', 'public_metrics'].join(',');

export const TWEET_EXPANSIONS = [
  'author_id',
  'referenced_tweets.id',
  'referenced_tweets.id.author_id',
  'in_reply_to_user_id',
].join(',');

/** Query params attached to every tweet-returning request. */
export function tweetQueryParams(): Record<string, string> {
  return {
    'tweet.fields': TWEET_FIELDS,
    'user.fields': USER_FIELDS,
    expansions: TWEET_EXPANSIONS,
  };
}

/** Query params attached to every user-returning request. */
export function userQueryParams(): Record<string, string> {
  return {
    'user.fields': USER_FIELDS,
  };
}

/**
 * X caps `max_results` per endpoint. Clamp to a safe range so a caller can't
 * trigger a 400. Timelines and bookmarks accept 5–100; recent search accepts
 * 10–100, so its caller passes `min: 10`.
 */
export function clampMaxResults(value: number | undefined, fallback: number, min = 5): number {
  if (value === undefined || Number.isNaN(value)) {
    return Math.max(min, Math.min(100, fallback));
  }
  return Math.max(min, Math.min(100, Math.floor(value)));
}
