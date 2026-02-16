import type { ISerpApiClient } from '../../shared/src/server.js';
import type {
  SearchHotelsOptions,
  SearchHotelsResult,
  GetHotelDetailsOptions,
  HotelDetailsResult,
  GetHotelReviewsOptions,
  HotelReviewsResult,
} from '../../shared/src/types.js';

export function createMockSerpApiClient(): ISerpApiClient {
  return {
    async searchHotels(options: SearchHotelsOptions): Promise<SearchHotelsResult> {
      return {
        search_parameters: {
          query: options.query,
          check_in_date: options.check_in_date,
          check_out_date: options.check_out_date,
          adults: options.adults ?? 2,
          currency: options.currency ?? 'USD',
        },
        total_results: 2,
        properties: [
          {
            name: 'Test Hotel Grand',
            type: 'hotel',
            description: 'A luxury test hotel',
            gps_coordinates: { latitude: 40.7128, longitude: -74.006 },
            check_in_time: '3:00 PM',
            check_out_time: '11:00 AM',
            rate_per_night: {
              lowest: '$200',
              extracted_lowest: 200,
              before_taxes_fees: '$180',
              extracted_before_taxes_fees: 180,
            },
            total_rate: {
              lowest: '$800',
              extracted_lowest: 800,
              before_taxes_fees: '$720',
              extracted_before_taxes_fees: 720,
            },
            prices: [
              {
                source: 'Booking.com',
                logo: null,
                rate_per_night: {
                  lowest: '$200',
                  extracted_lowest: 200,
                  before_taxes_fees: '$180',
                  extracted_before_taxes_fees: 180,
                },
              },
            ],
            images: [],
            overall_rating: 4.5,
            reviews: 1200,
            location_rating: 4.7,
            hotel_class: 4,
            amenities: ['Free Wi-Fi', 'Pool', 'Spa'],
            nearby_places: [
              {
                name: 'Central Park',
                transportations: [{ type: 'Walking', duration: '15 min' }],
              },
            ],
            essential_info: ['Free cancellation'],
            property_token: 'test-token-1',
            link: null,
          },
          {
            name: 'Test Budget Inn',
            type: 'hotel',
            description: 'Affordable test hotel',
            gps_coordinates: { latitude: 40.7589, longitude: -73.9851 },
            check_in_time: '2:00 PM',
            check_out_time: '12:00 PM',
            rate_per_night: {
              lowest: '$89',
              extracted_lowest: 89,
              before_taxes_fees: null,
              extracted_before_taxes_fees: null,
            },
            total_rate: null,
            prices: [],
            images: [],
            overall_rating: 3.5,
            reviews: 400,
            location_rating: 4.0,
            hotel_class: 2,
            amenities: ['Free Wi-Fi'],
            nearby_places: [],
            essential_info: [],
            property_token: 'test-token-2',
            link: null,
          },
        ],
        brands: [],
        next_page_token: null,
      };
    },

    async getHotelDetails(options: GetHotelDetailsOptions): Promise<HotelDetailsResult> {
      return {
        search_parameters: {
          check_in_date: options.check_in_date,
          check_out_date: options.check_out_date,
          adults: options.adults ?? 2,
          currency: options.currency ?? 'USD',
        },
        property: {
          name: 'Test Hotel Grand',
          type: 'hotel',
          description: 'A luxury test hotel with full details',
          gps_coordinates: { latitude: 40.7128, longitude: -74.006 },
          check_in_time: '3:00 PM',
          check_out_time: '11:00 AM',
          rate_per_night: {
            lowest: '$200',
            extracted_lowest: 200,
            before_taxes_fees: '$180',
            extracted_before_taxes_fees: 180,
          },
          total_rate: {
            lowest: '$800',
            extracted_lowest: 800,
            before_taxes_fees: '$720',
            extracted_before_taxes_fees: 720,
          },
          prices: [
            {
              source: 'Booking.com',
              logo: null,
              rate_per_night: {
                lowest: '$200',
                extracted_lowest: 200,
                before_taxes_fees: '$180',
                extracted_before_taxes_fees: 180,
              },
            },
            {
              source: 'Hotels.com',
              logo: null,
              rate_per_night: {
                lowest: '$210',
                extracted_lowest: 210,
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
          reviews: 1200,
          location_rating: 4.7,
          hotel_class: 4,
          amenities: ['Free Wi-Fi', 'Pool', 'Spa', 'Restaurant', 'Fitness Center', 'Bar'],
          nearby_places: [
            {
              name: 'Central Park',
              transportations: [{ type: 'Walking', duration: '15 min' }],
            },
            {
              name: 'JFK Airport',
              transportations: [{ type: 'Taxi', duration: '45 min' }],
            },
          ],
          essential_info: ['Free cancellation', 'Pay at property'],
          property_token: options.property_token,
          link: 'https://www.google.com/hotels/test',
        },
        reviews_breakdown: [
          {
            name: 'Cleanliness',
            description: 'Reviews about cleanliness',
            total_mentioned: 300,
            positive: 270,
            negative: 15,
            neutral: 15,
          },
          {
            name: 'Location',
            description: 'Reviews about location',
            total_mentioned: 500,
            positive: 470,
            negative: 10,
            neutral: 20,
          },
        ],
      };
    },

    async getHotelReviews(options: GetHotelReviewsOptions): Promise<HotelReviewsResult> {
      return {
        search_parameters: {
          property_token: options.property_token,
          sort_by: options.sort_by ?? 1,
        },
        reviews: [
          {
            user: {
              name: 'John Doe',
              link: 'https://example.com/user/johndoe',
              thumbnail: 'https://example.com/avatar.jpg',
            },
            source: 'Google',
            rating: 5,
            best_rating: 5,
            date: '2 weeks ago',
            snippet:
              'Amazing hotel with great service! The room was spotless and the staff was incredibly friendly. Would definitely stay here again.',
            images: [],
            subratings: {
              rooms: 5,
              service: 5,
              location: 4,
            },
            hotel_highlights: ['Great breakfast', 'Comfortable beds'],
            attributes: [
              { name: 'Trip type', snippet: 'Traveled as a couple' },
              { name: 'Room type', snippet: 'Deluxe King Room' },
            ],
            response: {
              date: '1 week ago',
              snippet:
                'Thank you for your wonderful review! We look forward to welcoming you back.',
            },
          },
          {
            user: {
              name: 'Jane Smith',
              link: null,
              thumbnail: null,
            },
            source: 'TripAdvisor',
            rating: 3,
            best_rating: 5,
            date: '1 month ago',
            snippet:
              'Decent hotel but the noise from the street was a bit much. Good location though.',
            images: ['https://example.com/review-photo.jpg'],
            subratings: {
              rooms: 3,
              service: 4,
              location: 5,
            },
            hotel_highlights: [],
            attributes: [{ name: 'Trip type', snippet: 'Traveled for business' }],
            response: null,
          },
        ],
        next_page_token: null,
      };
    },
  };
}
