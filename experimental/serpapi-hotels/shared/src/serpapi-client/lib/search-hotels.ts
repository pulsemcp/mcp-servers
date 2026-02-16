import type {
  SearchHotelsOptions,
  SearchHotelsResult,
  HotelProperty,
  HotelBrand,
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
  excluded_amenities?: string[];
  nearby_places?: Array<{
    name?: string;
    transportations?: Array<{ type?: string; duration?: string }>;
  }>;
  essential_info?: string[];
  property_token?: string;
  link?: string;
}

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

function parseBrand(raw: SerpApiRawBrand): HotelBrand {
  return {
    id: raw.id || 0,
    name: raw.name || 'Unknown',
    children: (raw.children || []).map((c) => ({
      id: c.id || 0,
      name: c.name || 'Unknown',
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

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpAPI request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as SerpApiResponse;

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const properties = (data.properties || []).map(parseProperty);
  const brands = (data.brands || []).map(parseBrand);

  return {
    search_parameters: {
      query: options.query,
      check_in_date: options.check_in_date,
      check_out_date: options.check_out_date,
      adults: options.adults || 2,
      currency: options.currency || 'USD',
    },
    total_results: data.search_information?.total_results || null,
    properties,
    brands,
    next_page_token: data.serpapi_pagination?.next_page_token || null,
  };
}
