export interface HotelProperty {
  name: string;
  type: string;
  description: string | null;
  gps_coordinates: { latitude: number; longitude: number } | null;
  check_in_time: string | null;
  check_out_time: string | null;
  rate_per_night: {
    lowest: string;
    extracted_lowest: number;
    before_taxes_fees: string | null;
    extracted_before_taxes_fees: number | null;
  } | null;
  total_rate: {
    lowest: string;
    extracted_lowest: number;
    before_taxes_fees: string | null;
    extracted_before_taxes_fees: number | null;
  } | null;
  prices: HotelPrice[];
  images: { thumbnail: string; original_image: string }[];
  overall_rating: number | null;
  reviews: number | null;
  location_rating: number | null;
  hotel_class: number | null;
  amenities: string[];
  nearby_places: NearbyPlace[];
  essential_info: string[];
  property_token: string | null;
  link: string | null;
}

export interface HotelPrice {
  source: string;
  logo: string | null;
  rate_per_night: {
    lowest: string;
    extracted_lowest: number;
    before_taxes_fees: string | null;
    extracted_before_taxes_fees: number | null;
  };
}

export interface NearbyPlace {
  name: string;
  transportations: { type: string; duration: string }[];
}

export interface ReviewsBreakdown {
  name: string;
  description: string | null;
  total_mentioned: number;
  positive: number;
  negative: number;
  neutral: number;
}

export interface SearchHotelsOptions {
  query: string;
  check_in_date: string;
  check_out_date: string;
  adults?: number;
  children?: number;
  children_ages?: string;
  currency?: string;
  gl?: string;
  hl?: string;
  sort_by?: number;
  min_price?: number;
  max_price?: number;
  rating?: number;
  hotel_class?: string;
  free_cancellation?: boolean;
  special_offers?: boolean;
  eco_certified?: boolean;
  vacation_rentals?: boolean;
  next_page_token?: string;
}

export interface SearchHotelsResult {
  search_parameters: {
    query: string;
    check_in_date: string;
    check_out_date: string;
    adults: number;
    currency: string;
  };
  total_results: number | null;
  properties: HotelProperty[];
  brands: HotelBrand[];
  next_page_token: string | null;
}

export interface HotelBrand {
  id: number;
  name: string;
  children: { id: number; name: string }[];
}

export interface GetHotelDetailsOptions {
  property_token: string;
  check_in_date: string;
  check_out_date: string;
  adults?: number;
  children?: number;
  children_ages?: string;
  currency?: string;
  gl?: string;
  hl?: string;
}

export interface HotelDetailsResult {
  search_parameters: {
    check_in_date: string;
    check_out_date: string;
    adults: number;
    currency: string;
  };
  property: HotelProperty;
  reviews_breakdown: ReviewsBreakdown[];
}
