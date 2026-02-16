import type { ISerpApiClient } from '../server.js';
import type {
  SearchHotelsOptions,
  SearchHotelsResult,
  GetHotelDetailsOptions,
  HotelDetailsResult,
} from '../types.js';

interface MockData {
  searchResults?: Record<string, SearchHotelsResult>;
  hotelDetails?: Record<string, HotelDetailsResult>;
}

export function createIntegrationMockSerpApiClient(mockData: MockData = {}): ISerpApiClient & {
  mockData: MockData;
} {
  const defaultSearchResult: SearchHotelsResult = {
    search_parameters: {
      query: 'Hotels in New York',
      check_in_date: '2026-03-01',
      check_out_date: '2026-03-05',
      adults: 2,
      currency: 'USD',
    },
    total_results: 150,
    properties: [
      {
        name: 'Mock Hotel Grand',
        type: 'hotel',
        description: 'A luxury hotel in the heart of the city',
        gps_coordinates: { latitude: 40.7128, longitude: -74.006 },
        check_in_time: '3:00 PM',
        check_out_time: '11:00 AM',
        rate_per_night: {
          lowest: '$250',
          extracted_lowest: 250,
          before_taxes_fees: '$220',
          extracted_before_taxes_fees: 220,
        },
        total_rate: {
          lowest: '$1,000',
          extracted_lowest: 1000,
          before_taxes_fees: '$880',
          extracted_before_taxes_fees: 880,
        },
        prices: [
          {
            source: 'Booking.com',
            logo: null,
            rate_per_night: {
              lowest: '$250',
              extracted_lowest: 250,
              before_taxes_fees: '$220',
              extracted_before_taxes_fees: 220,
            },
          },
          {
            source: 'Hotels.com',
            logo: null,
            rate_per_night: {
              lowest: '$260',
              extracted_lowest: 260,
              before_taxes_fees: null,
              extracted_before_taxes_fees: null,
            },
          },
        ],
        images: [
          {
            thumbnail: 'https://example.com/thumb.jpg',
            original_image: 'https://example.com/full.jpg',
          },
        ],
        overall_rating: 4.5,
        reviews: 2500,
        location_rating: 4.8,
        hotel_class: 4,
        amenities: ['Free Wi-Fi', 'Pool', 'Spa', 'Restaurant', 'Fitness Center'],
        nearby_places: [
          { name: 'Times Square', transportations: [{ type: 'Walking', duration: '10 min' }] },
          { name: 'JFK Airport', transportations: [{ type: 'Taxi', duration: '45 min' }] },
        ],
        essential_info: ['Free cancellation', 'Pay at property'],
        property_token: 'mock-property-token-1',
        link: 'https://www.google.com/hotels/mock-1',
      },
      {
        name: 'Mock Budget Inn',
        type: 'hotel',
        description: 'Affordable comfort for travelers',
        gps_coordinates: { latitude: 40.7589, longitude: -73.9851 },
        check_in_time: '2:00 PM',
        check_out_time: '12:00 PM',
        rate_per_night: {
          lowest: '$89',
          extracted_lowest: 89,
          before_taxes_fees: null,
          extracted_before_taxes_fees: null,
        },
        total_rate: {
          lowest: '$356',
          extracted_lowest: 356,
          before_taxes_fees: null,
          extracted_before_taxes_fees: null,
        },
        prices: [
          {
            source: 'Expedia',
            logo: null,
            rate_per_night: {
              lowest: '$89',
              extracted_lowest: 89,
              before_taxes_fees: null,
              extracted_before_taxes_fees: null,
            },
          },
        ],
        images: [],
        overall_rating: 3.8,
        reviews: 800,
        location_rating: 4.2,
        hotel_class: 2,
        amenities: ['Free Wi-Fi', 'Parking'],
        nearby_places: [],
        essential_info: [],
        property_token: 'mock-property-token-2',
        link: null,
      },
    ],
    brands: [
      {
        id: 33,
        name: 'Hilton',
        children: [
          { id: 34, name: 'Hilton Hotels & Resorts' },
          { id: 35, name: 'Hampton by Hilton' },
        ],
      },
    ],
    next_page_token: 'mock-next-page-token',
  };

  const defaultDetailsResult: HotelDetailsResult = {
    search_parameters: {
      check_in_date: '2026-03-01',
      check_out_date: '2026-03-05',
      adults: 2,
      currency: 'USD',
    },
    property: defaultSearchResult.properties[0],
    reviews_breakdown: [
      {
        name: 'Cleanliness',
        description: 'Reviews mentioning cleanliness',
        total_mentioned: 500,
        positive: 450,
        negative: 30,
        neutral: 20,
      },
      {
        name: 'Location',
        description: 'Reviews mentioning location',
        total_mentioned: 800,
        positive: 750,
        negative: 20,
        neutral: 30,
      },
      {
        name: 'Service',
        description: 'Reviews mentioning service',
        total_mentioned: 600,
        positive: 520,
        negative: 50,
        neutral: 30,
      },
    ],
  };

  return {
    mockData,

    async searchHotels(options: SearchHotelsOptions): Promise<SearchHotelsResult> {
      const key = options.query;
      if (mockData.searchResults?.[key]) {
        return mockData.searchResults[key];
      }
      return {
        ...defaultSearchResult,
        search_parameters: {
          ...defaultSearchResult.search_parameters,
          query: options.query,
          check_in_date: options.check_in_date,
          check_out_date: options.check_out_date,
          adults: options.adults || 2,
          currency: options.currency || 'USD',
        },
      };
    },

    async getHotelDetails(options: GetHotelDetailsOptions): Promise<HotelDetailsResult> {
      const key = options.property_token;
      if (mockData.hotelDetails?.[key]) {
        return mockData.hotelDetails[key];
      }
      return {
        ...defaultDetailsResult,
        search_parameters: {
          ...defaultDetailsResult.search_parameters,
          check_in_date: options.check_in_date,
          check_out_date: options.check_out_date,
          adults: options.adults || 2,
          currency: options.currency || 'USD',
        },
      };
    },
  };
}
