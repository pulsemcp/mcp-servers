/**
 * Thin GraphQL transport for the Monarch Money API.
 *
 * Why a custom client? The full surface we expose (40+ tools spanning accounts,
 * transactions, budgets, rules, and net worth) is wider than any maintained
 * TypeScript client we evaluated, so a small in-house transport gives us
 * direct control over typing, retries, and error mapping with no extra
 * dependency. It is intentionally minimal — just enough to POST a GraphQL
 * operation, surface auth/network errors, and return the typed `data` payload.
 */

export interface GraphQLError {
  message: string;
  path?: (string | number)[];
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

export interface GraphQLTransport {
  request<T>(operation: { query: string; variables?: Record<string, unknown> }): Promise<T>;
}

export interface CreateGraphQLTransportOptions {
  endpoint?: string;
  token: string;
  fetchImpl?: typeof fetch;
  /** Optional client identifier sent in the `x-cio-client-platform` header. */
  clientPlatform?: string;
  /**
   * Stable identifier echoed back in the `device-uuid` header. Mirrors the
   * value persisted by the auth flow so GraphQL calls share the same trusted
   * device identity that login negotiated.
   */
  deviceUuid?: string;
}

const DEFAULT_ENDPOINT = 'https://api.monarch.com/graphql';

export class MonarchAuthError extends Error {
  constructor(message = 'Monarch session token is missing or invalid') {
    super(message);
    this.name = 'MonarchAuthError';
  }
}

export class MonarchGraphQLError extends Error {
  constructor(
    message: string,
    public readonly errors: GraphQLError[]
  ) {
    super(message);
    this.name = 'MonarchGraphQLError';
  }
}

export function createGraphQLTransport(options: CreateGraphQLTransportOptions): GraphQLTransport {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const fetchImpl = options.fetchImpl ?? fetch;
  const clientPlatform = options.clientPlatform ?? 'web';

  return {
    async request<T>({
      query,
      variables,
    }: {
      query: string;
      variables?: Record<string, unknown>;
    }): Promise<T> {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Token ${options.token}`,
        'x-cio-client-platform': clientPlatform,
        'x-cio-site-id': 'monarch-money-mcp',
        'client-platform': 'web',
      };
      if (options.deviceUuid) headers['device-uuid'] = options.deviceUuid;

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: variables ?? {} }),
      });

      if (response.status === 401 || response.status === 403) {
        throw new MonarchAuthError(
          `Monarch returned ${response.status} ${response.statusText} — re-authenticate via the login script.`
        );
      }

      const text = await response.text();
      if (!response.ok) {
        throw new Error(
          `Monarch API request failed: ${response.status} ${response.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`
        );
      }

      let parsed: GraphQLResponse<T>;
      try {
        parsed = JSON.parse(text) as GraphQLResponse<T>;
      } catch {
        throw new Error(
          `Monarch API returned a non-JSON response (status ${response.status}): ${text.slice(0, 200)}`
        );
      }

      if (parsed.errors && parsed.errors.length > 0) {
        const isAuthError = parsed.errors.some((e) =>
          /unauthor|not authenticated|forbidden/i.test(e.message)
        );
        if (isAuthError) {
          throw new MonarchAuthError(parsed.errors.map((e) => e.message).join('; '));
        }
        throw new MonarchGraphQLError(
          `Monarch GraphQL errors: ${parsed.errors.map((e) => e.message).join('; ')}`,
          parsed.errors
        );
      }

      if (!parsed.data) {
        throw new Error('Monarch API returned an empty response');
      }

      return parsed.data;
    },
  };
}
