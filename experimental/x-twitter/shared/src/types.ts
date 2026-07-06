/**
 * Types for the X (Twitter) API v2 response envelopes we consume.
 *
 * These describe only the read-only endpoints this server exposes. They are
 * intentionally partial — X returns many more fields than we surface, and we
 * only type the ones we request via `tweet.fields` / `user.fields`.
 */

export interface XPublicMetrics {
  retweet_count?: number;
  reply_count?: number;
  like_count?: number;
  quote_count?: number;
  bookmark_count?: number;
  impression_count?: number;
}

export interface XReferencedTweet {
  type: 'retweeted' | 'quoted' | 'replied_to';
  id: string;
}

export interface XNoteTweet {
  text: string;
}

export interface XTweet {
  id: string;
  text: string;
  author_id?: string;
  created_at?: string;
  conversation_id?: string;
  in_reply_to_user_id?: string;
  lang?: string;
  public_metrics?: XPublicMetrics;
  referenced_tweets?: XReferencedTweet[];
  note_tweet?: XNoteTweet;
  entities?: unknown;
  attachments?: unknown;
}

export interface XUser {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  verified?: boolean;
  public_metrics?: {
    followers_count?: number;
    following_count?: number;
    tweet_count?: number;
    listed_count?: number;
  };
}

export interface XMeta {
  result_count?: number;
  next_token?: string;
  previous_token?: string;
  newest_id?: string;
  oldest_id?: string;
}

export interface XIncludes {
  users?: XUser[];
  tweets?: XTweet[];
}

export interface XError {
  title?: string;
  detail?: string;
  type?: string;
  resource_type?: string;
  parameter?: string;
  value?: string;
}

/** A list-shaped response envelope, e.g. timelines, bookmarks, search. */
export interface XListResponse {
  data?: XTweet[];
  includes?: XIncludes;
  meta?: XMeta;
  errors?: XError[];
}

/** A single-tweet response envelope, e.g. GET /2/tweets/:id. */
export interface XSingleTweetResponse {
  data?: XTweet;
  includes?: XIncludes;
  errors?: XError[];
}

/** A multi-tweet lookup response envelope, e.g. GET /2/tweets?ids=. */
export interface XTweetsLookupResponse {
  data?: XTweet[];
  includes?: XIncludes;
  errors?: XError[];
}

/** A single-user response envelope, e.g. GET /2/users/me. */
export interface XSingleUserResponse {
  data?: XUser;
  errors?: XError[];
}

/**
 * A bookmark write response envelope, e.g. POST/DELETE
 * /2/users/:id/bookmarks. `bookmarked` is `true` after a successful create and
 * `false` after a successful removal.
 */
export interface XBookmarkWriteResponse {
  data?: { bookmarked: boolean };
  errors?: XError[];
}

/**
 * The surface of the X API this server depends on. It is overwhelmingly reads;
 * the only mutations are bookmark create/remove, which touch only the
 * authenticated user's PRIVATE bookmark collection (no public actions like
 * posting, replying, liking, retweeting, following, or DMing). Implementations
 * are injected via a `clientFactory` seam so tests can substitute a mock
 * without touching internal code.
 */
export interface IXClient {
  /** GET /2/users/me — the authenticated user. */
  getMe(): Promise<XSingleUserResponse>;

  /** GET /2/users/by/username/:username — look up a user by handle. */
  getUserByUsername(username: string): Promise<XSingleUserResponse>;

  /** GET /2/users/:id/timelines/reverse_chronological — the home timeline. */
  getHomeTimeline(params: {
    maxResults?: number;
    paginationToken?: string;
  }): Promise<XListResponse>;

  /**
   * GET /2/users/:id/tweets — a user's own tweet history (defaults to the
   * authenticated user when `username` is omitted).
   */
  getUserTweets(params: {
    username?: string;
    maxResults?: number;
    paginationToken?: string;
    excludeReplies?: boolean;
    excludeRetweets?: boolean;
  }): Promise<XListResponse>;

  /** GET /2/users/:id/bookmarks — the authenticated user's bookmarks. */
  getBookmarks(params: { maxResults?: number; paginationToken?: string }): Promise<XListResponse>;

  /** GET /2/tweets/search/recent — recent (last 7 days) search. */
  searchRecent(params: {
    query: string;
    maxResults?: number;
    paginationToken?: string;
  }): Promise<XListResponse>;

  /** GET /2/tweets?ids= — look up one or more tweets by id. */
  getTweets(ids: string[]): Promise<XTweetsLookupResponse>;

  /**
   * POST /2/users/:id/bookmarks — add a tweet to the authenticated user's
   * PRIVATE bookmarks. Requires the `bookmark.write` scope.
   */
  createBookmark(tweetId: string): Promise<XBookmarkWriteResponse>;

  /**
   * DELETE /2/users/:id/bookmarks/:tweet_id — remove a tweet from the
   * authenticated user's PRIVATE bookmarks. Requires the `bookmark.write` scope.
   */
  removeBookmark(tweetId: string): Promise<XBookmarkWriteResponse>;
}
