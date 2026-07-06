/**
 * Helpers for turning X API response envelopes into compact, readable text for
 * MCP tool output. These flatten the `includes` side-channel (where X puts
 * expanded authors and referenced tweets) into each tweet so the model doesn't
 * have to cross-reference ids by hand.
 */

import type { XIncludes, XListResponse, XTweet, XUser } from '../types.js';

/** Prefer the full note_tweet text (for long tweets) over the truncated text. */
export function tweetText(tweet: XTweet): string {
  return tweet.note_tweet?.text ?? tweet.text;
}

function usersById(includes?: XIncludes): Map<string, XUser> {
  const map = new Map<string, XUser>();
  for (const user of includes?.users ?? []) {
    map.set(user.id, user);
  }
  return map;
}

function formatMetrics(tweet: XTweet): string {
  const m = tweet.public_metrics;
  if (!m) return '';
  const parts = [
    m.like_count !== undefined ? `${m.like_count} likes` : null,
    m.retweet_count !== undefined ? `${m.retweet_count} retweets` : null,
    m.reply_count !== undefined ? `${m.reply_count} replies` : null,
    m.quote_count !== undefined ? `${m.quote_count} quotes` : null,
  ].filter(Boolean);
  return parts.length ? ` — ${parts.join(', ')}` : '';
}

/** Renders a single tweet as a text block, resolving its author from includes. */
export function formatTweet(tweet: XTweet, authors: Map<string, XUser>): string {
  const author = tweet.author_id ? authors.get(tweet.author_id) : undefined;
  const handle = author ? `@${author.username} (${author.name})` : 'unknown author';
  const when = tweet.created_at ? ` · ${tweet.created_at}` : '';
  const refs = tweet.referenced_tweets?.length
    ? `\n  references: ${tweet.referenced_tweets.map((r) => `${r.type} ${r.id}`).join(', ')}`
    : '';
  const lines = [
    `${handle}${when}`,
    `  id: ${tweet.id}${formatMetrics(tweet)}`,
    `  ${tweetText(tweet).replace(/\n/g, '\n  ')}${refs}`,
  ];
  return lines.join('\n');
}

/** Renders a list-shaped response (timeline, bookmarks, search) as text. */
export function formatTweetList(response: XListResponse, emptyMessage: string): string {
  const tweets = response.data ?? [];
  if (tweets.length === 0) {
    if (response.errors?.length) {
      return `${emptyMessage}\n\nAPI errors:\n${JSON.stringify(response.errors, null, 2)}`;
    }
    return emptyMessage;
  }

  const authors = usersById(response.includes);
  const body = tweets.map((tweet) => formatTweet(tweet, authors)).join('\n\n');

  const next = response.meta?.next_token
    ? `\n\n(more results available — pagination_token: ${response.meta.next_token})`
    : '';

  return `${tweets.length} tweet(s):\n\n${body}${next}`;
}

/** Renders a user object as text. */
export function formatUser(user: XUser): string {
  const m = user.public_metrics;
  const verified = user.verified ? ' [verified]' : '';
  const lines = [
    `@${user.username} (${user.name})${verified}`,
    `  id: ${user.id}${user.created_at ? ` · joined ${user.created_at}` : ''}`,
  ];
  if (m) {
    lines.push(
      `  followers: ${m.followers_count ?? '?'}, following: ${
        m.following_count ?? '?'
      }, tweets: ${m.tweet_count ?? '?'}`
    );
  }
  if (user.description) {
    lines.push(`  bio: ${user.description}`);
  }
  return lines.join('\n');
}
