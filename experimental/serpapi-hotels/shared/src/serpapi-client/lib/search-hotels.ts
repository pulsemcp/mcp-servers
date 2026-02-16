import type { SearchHotelsOptions, SearchHotelsResult, HotelBrand } from '../../types.js';
import { parseProperty, type SerpApiRawProperty } from './parse-property.js';

interface SerpApiRawBrand {
  id?: number;
  name?: string;
  children?: Array<{ id?: number; name?: string }>;
}

interface SerpApiResponse {
  search_parameters?: Record<string, unknown>;
  search_information?: { total_results?: number };
  properties?: SerpApiRawProperty[];
  brands?: SerpApiRawBrand[];
  serpapi_pagination?: { next_page_token?: string; next?: string };
  error?: string;
}

function parseBrand(raw: SerpApiRawBrand): HotelBrand {
  return {
    id: raw.id ?? 0,
    name: raw.name ?? 'Unknown',
    children: (raw.children ?? []).map((c) => ({
      id: c.id ?? 0,
      name: c.name ?? 'Unknown',
    })),
  };
}

export async function searchHotels(
  apiKey: string,
  options: SearchHotelsOptions
): Promise<SearchHotelsResult> {
  const params = new URLSearchParams({
    engine: 'google_hotels',
    api_key: apiKey,
    q: options.query,
    check_in_date: options.check_in_date,
    check_out_date: options.check_out_date,
    output: 'json',
  });

  if (options.adults !== undefined) params.set('adults', String(options.adults));
  if (options.children !== undefined) params.set('children', String(options.children));
  if (options.children_ages) params.set('children_ages', options.children_ages);
  if (options.currency) params.set('currency', options.currency);
  if (options.gl) params.set('gl', options.gl);
  if (options.hl) params.set('hl', options.hl);
  if (options.sort_by !== undefined) params.set('sort_by', String(options.sort_by));
  if (options.min_price !== undefined) params.set('min_price', String(options.min_price));
  if (options.max_price !== undefined) params.set('max_price', String(options.max_price));
  if (options.rating !== undefined) params.set('rating', String(options.rating));
  if (options.hotel_class) params.set('hotel_class', options.hotel_class);
  if (options.free_cancellation) params.set('free_cancellation', 'true');
  if (options.special_offers) params.set('special_offers', 'true');
  if (options.eco_certified) params.set('eco_certified', 'true');
  if (options.vacation_rentals) params.set('vacation_rentals', 'true');
  if (options.next_page_token) params.set('next_page_token', options.next_page_token);

  const url = `https://serpapi.com/search?${params.toString()}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpAPI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as SerpApiResponse;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const properties = (data.properties ?? []).map(parseProperty);
  const brands = (data.brands ?? []).map(parseBrand);

  return {
    search_parameters: {
      query: options.query,
      check_in_date: options.check_in_date,
      check_out_date: options.check_out_date,
      adults: options.adults ?? 2,
      currency: options.currency ?? 'USD',
    },
    total_results: data.search_information?.total_results ?? null,
    properties,
    brands,
    next_page_token: data.serpapi_pagination?.next_page_token ?? null,
  };
}
