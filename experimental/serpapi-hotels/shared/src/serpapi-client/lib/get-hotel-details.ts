import type { GetHotelDetailsOptions, HotelDetailsResult, ReviewsBreakdown } from '../../types.js';
import { parseProperty, type SerpApiRawProperty } from './parse-property.js';

interface SerpApiDetailsResponse {
  search_parameters?: Record<string, unknown>;
  properties?: SerpApiRawProperty[];
  reviews_breakdown?: Array<{
    name?: string;
    description?: string;
    total_mentioned?: number;
    positive?: number;
    negative?: number;
    neutral?: number;
  }>;
  error?: string;
}

export async function getHotelDetails(
  apiKey: string,
  options: GetHotelDetailsOptions
): Promise<HotelDetailsResult> {
  const params = new URLSearchParams({
    engine: 'google_hotels',
    api_key: apiKey,
    property_token: options.property_token,
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

  const url = `https://serpapi.com/search?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpAPI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as SerpApiDetailsResponse;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const rawProperty = data.properties?.[0];
  if (!rawProperty) {
    throw new Error('No property details returned from SerpAPI');
  }

  const property = parseProperty(rawProperty);

  const reviews_breakdown: ReviewsBreakdown[] = (data.reviews_breakdown ?? []).map((rb) => ({
    name: rb.name ?? '',
    description: rb.description ?? null,
    total_mentioned: rb.total_mentioned ?? 0,
    positive: rb.positive ?? 0,
    negative: rb.negative ?? 0,
    neutral: rb.neutral ?? 0,
  }));

  return {
    search_parameters: {
      check_in_date: options.check_in_date,
      check_out_date: options.check_out_date,
      adults: options.adults ?? 2,
      currency: options.currency ?? 'USD',
    },
    property,
    reviews_breakdown,
  };
}
