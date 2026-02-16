import type { GetHotelReviewsOptions, HotelReviewsResult, HotelReview } from '../../types.js';

interface SerpApiReviewsResponse {
  search_parameters?: Record<string, unknown>;
  reviews?: Array<{
    link?: string;
    user?: {
      name?: string;
      link?: string;
      thumbnail?: string;
    };
    source?: string;
    source_icon?: string;
    rating?: number;
    best_rating?: number;
    date?: string;
    snippet?: string;
    images?: string[];
    subratings?: {
      rooms?: number;
      service?: number;
      location?: number;
    };
    hotel_highlights?: string[];
    attributes?: Array<{
      name?: string;
      snippet?: string;
    }>;
    response?: {
      date?: string;
      snippet?: string;
    };
  }>;
  serpapi_pagination?: {
    next_page_token?: string;
    next?: string;
  };
  error?: string;
}

export async function getHotelReviews(
  apiKey: string,
  options: GetHotelReviewsOptions
): Promise<HotelReviewsResult> {
  const params = new URLSearchParams({
    engine: 'google_hotels_reviews',
    api_key: apiKey,
    property_token: options.property_token,
    output: 'json',
  });

  if (options.sort_by !== undefined) params.set('sort_by', String(options.sort_by));
  if (options.category_token) params.set('category_token', options.category_token);
  if (options.source_number !== undefined)
    params.set('source_number', String(options.source_number));
  if (options.hl) params.set('hl', options.hl);
  if (options.next_page_token) params.set('next_page_token', options.next_page_token);

  const url = `https://serpapi.com/search?${params.toString()}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpAPI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as SerpApiReviewsResponse;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const reviews: HotelReview[] = (data.reviews ?? []).map((r) => ({
    user: {
      name: r.user?.name ?? 'Anonymous',
      link: r.user?.link ?? null,
      thumbnail: r.user?.thumbnail ?? null,
    },
    source: r.source ?? 'Unknown',
    rating: r.rating ?? 0,
    best_rating: r.best_rating ?? 5,
    date: r.date ?? '',
    snippet: r.snippet ?? null,
    images: r.images ?? [],
    subratings: {
      rooms: r.subratings?.rooms ?? null,
      service: r.subratings?.service ?? null,
      location: r.subratings?.location ?? null,
    },
    hotel_highlights: r.hotel_highlights ?? [],
    attributes: (r.attributes ?? []).map((a) => ({
      name: a.name ?? '',
      snippet: a.snippet ?? '',
    })),
    response:
      r.response?.snippet != null
        ? {
            date: r.response.date ?? '',
            snippet: r.response.snippet,
          }
        : null,
  }));

  return {
    search_parameters: {
      property_token: options.property_token,
      sort_by: options.sort_by ?? 1,
    },
    reviews,
    next_page_token: data.serpapi_pagination?.next_page_token ?? null,
  };
}
