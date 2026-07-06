/**
 * In-memory mock implementation of IXClient for integration tests.
 *
 * Returns deterministic, X-API-shaped envelopes (data + includes + meta) so the
 * full MCP protocol path can be exercised without real network access. This
 * mocks only the EXTERNAL client boundary — no internal code is mocked.
 */
import type {
  IXClient,
  XBookmarkWriteResponse,
  XListResponse,
  XSingleUserResponse,
  XTweetsLookupResponse,
  XUser,
  XTweet,
} from '../shared/types.js';

const ME: XUser = {
  id: '1000',
  name: 'Mock Me',
  username: 'mock_me',
  created_at: '2020-01-01T00:00:00.000Z',
  description: 'The authenticated mock user',
  verified: true,
  public_metrics: {
    followers_count: 123,
    following_count: 45,
    tweet_count: 678,
    listed_count: 9,
  },
};

const OTHER: XUser = {
  id: '2000',
  name: 'Another Account',
  username: 'another_account',
  created_at: '2019-05-05T00:00:00.000Z',
  description: 'Someone the mock user follows',
  public_metrics: {
    followers_count: 5000,
    following_count: 100,
    tweet_count: 4321,
    listed_count: 50,
  },
};

function tweet(id: string, authorId: string, text: string): XTweet {
  return {
    id,
    text,
    author_id: authorId,
    created_at: '2024-06-01T12:00:00.000Z',
    public_metrics: {
      like_count: 10,
      retweet_count: 2,
      reply_count: 1,
      quote_count: 0,
      bookmark_count: 3,
      impression_count: 500,
    },
  };
}

export function createMockXClient(): IXClient {
  return {
    async getMe(): Promise<XSingleUserResponse> {
      return { data: ME };
    },

    async getUserByUsername(username: string): Promise<XSingleUserResponse> {
      const handle = username.replace(/^@/, '').toLowerCase();
      if (handle === ME.username) return { data: ME };
      if (handle === OTHER.username) return { data: OTHER };
      return {
        errors: [
          {
            title: 'Not Found Error',
            detail: `Could not find user with username: [${username}].`,
            type: 'https://api.twitter.com/2/problems/resource-not-found',
          },
        ],
      };
    },

    async getHomeTimeline(): Promise<XListResponse> {
      return {
        data: [
          tweet('3001', OTHER.id, 'A tweet on the home timeline'),
          tweet('3002', OTHER.id, 'Another timeline tweet'),
        ],
        includes: { users: [OTHER] },
        meta: { result_count: 2, next_token: 'timeline-next' },
      };
    },

    async getUserTweets(params: { username?: string }): Promise<XListResponse> {
      const author = params.username ? OTHER : ME;
      return {
        data: [
          tweet('6001', author.id, `A tweet by @${author.username}`),
          tweet('6002', author.id, `Another tweet by @${author.username}`),
        ],
        includes: { users: [author] },
        meta: { result_count: 2 },
      };
    },

    async getBookmarks(): Promise<XListResponse> {
      return {
        data: [tweet('4001', OTHER.id, 'A bookmarked tweet')],
        includes: { users: [OTHER] },
        meta: { result_count: 1 },
      };
    },

    async searchRecent(params: { query: string }): Promise<XListResponse> {
      return {
        data: [tweet('5001', ME.id, `Result matching "${params.query}"`)],
        includes: { users: [ME] },
        meta: { result_count: 1 },
      };
    },

    async getTweets(ids: string[]): Promise<XTweetsLookupResponse> {
      const data = ids.map((id) => tweet(id, OTHER.id, `Looked-up tweet ${id}`));
      return { data, includes: { users: [OTHER] } };
    },

    async createBookmark(): Promise<XBookmarkWriteResponse> {
      return { data: { bookmarked: true } };
    },

    async removeBookmark(): Promise<XBookmarkWriteResponse> {
      return { data: { bookmarked: false } };
    },
  };
}
