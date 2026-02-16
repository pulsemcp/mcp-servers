import type {
  GetHotelDetailsOptions,
  HotelDetailsResult,
  HotelProperty,
  ReviewsBreakdown,
} from '../../types.js';

interface SerpApiRawProperty {
  type?: string;
  name?: string;
  description?: string;
  gps_coordinates?: { latitude: number; longitude: number };
  check_in_time?: string;
  check_out_time?: string;
  rate_per_night?: {
    lowest?: string;
    extracted_lowest?: number;
    before_taxes_fees?: string;
    extracted_before_taxes_fees?: number;
  };
  total_rate?: {
    lowest?: string;
    extracted_lowest?: number;
    before_taxes_fees?: string;
    extracted_before_taxes_fees?: number;
  };
  prices?: Array<{
    source?: string;
    logo?: string;
    rate_per_night?: {
      lowest?: string;
      extracted_lowest?: number;
      before_taxes_fees?: string;
      extracted_before_taxes_fees?: number;
    };
  }>;
  images?: Array<{ thumbnail?: string; original_image?: string }>;
  overall_rating?: number;
  reviews?: number;
  location_rating?: number;
  hotel_class?: number;
  amenities?: string[];
  nearby_places?: Array<{
    name?: string;
    transportations?: Array<{ type?: string; duration?: string }>;
  }>;
  essential_info?: string[];
  property_token?: string;
  link?: string;
}

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

function parseProperty(raw: SerpApiRawProperty): HotelProperty {
  return {
    name: raw.name || 'Unknown',
    type: raw.type || 'hotel',
    description: raw.description || null,
    gps_coordinates: raw.gps_coordinates || null,
    check_in_time: raw.check_in_time || null,
    check_out_time: raw.check_out_time || null,
    rate_per_night: raw.rate_per_night
      ? {
          lowest: raw.rate_per_night.lowest || '',
          extracted_lowest: raw.rate_per_night.extracted_lowest || 0,
          before_taxes_fees: raw.rate_per_night.before_taxes_fees || null,
          extracted_before_taxes_fees: raw.rate_per_night.extracted_before_taxes_fees || null,
        }
      : null,
    total_rate: raw.total_rate
      ? {
          lowest: raw.total_rate.lowest || '',
          extracted_lowest: raw.total_rate.extracted_lowest || 0,
          before_taxes_fees: raw.total_rate.before_taxes_fees || null,
          extracted_before_taxes_fees: raw.total_rate.extracted_before_taxes_fees || null,
        }
      : null,
    prices: (raw.prices || []).map((p) => ({
      source: p.source || 'Unknown',
      logo: p.logo || null,
      rate_per_night: {
        lowest: p.rate_per_night?.lowest || '',
        extracted_lowest: p.rate_per_night?.extracted_lowest || 0,
        before_taxes_fees: p.rate_per_night?.before_taxes_fees || null,
        extracted_before_taxes_fees: p.rate_per_night?.extracted_before_taxes_fees || null,
      },
    })),
    images: (raw.images || []).map((img) => ({
      thumbnail: img.thumbnail || '',
      original_image: img.original_image || '',
    })),
    overall_rating: raw.overall_rating || null,
    reviews: raw.reviews || null,
    location_rating: raw.location_rating || null,
    hotel_class: raw.hotel_class || null,
    amenities: raw.amenities || [],
    nearby_places: (raw.nearby_places || []).map((np) => ({
      name: np.name || '',
      transportations: (np.transportations || []).map((t) => ({
        type: t.type || '',
        duration: t.duration || '',
      })),
    })),
    essential_info: raw.essential_info || [],
    property_token: raw.property_token || null,
    link: raw.link || null,
  };
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

  const reviews_breakdown: ReviewsBreakdown[] = (data.reviews_breakdown || []).map((rb) => ({
    name: rb.name || '',
    description: rb.description || null,
    total_mentioned: rb.total_mentioned || 0,
    positive: rb.positive || 0,
    negative: rb.negative || 0,
    neutral: rb.neutral || 0,
  }));

  return {
    search_parameters: {
      check_in_date: options.check_in_date,
      check_out_date: options.check_out_date,
      adults: options.adults || 2,
      currency: options.currency || 'USD',
    },
    property,
    reviews_breakdown,
  };
}
