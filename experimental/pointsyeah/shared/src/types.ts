import { z } from 'zod';

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface CognitoTokens {
  accessToken: string;
  idToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

export interface CognitoAuthResult {
  AuthenticationResult: {
    AccessToken: string;
    IdToken: string;
    ExpiresIn: number;
    TokenType: string;
  };
}

// =============================================================================
// FLIGHT SEARCH TYPES
// =============================================================================

export const FlightSearchParamsSchema = z.object({
  departure: z.string().min(1).describe('Origin airport or city code (e.g., "SFO", "NYC")'),
  arrival: z.string().min(1).describe('Destination airport or city code (e.g., "NYC", "LAX")'),
  departDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe('Outbound departure date in YYYY-MM-DD format'),
  returnDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe('Return date in YYYY-MM-DD format (required for round-trip)'),
  tripType: z
    .enum(['1', '2'])
    .default('2')
    .describe('Trip type: "1" for one-way, "2" for round-trip. Default: "2"'),
  adults: z.number().min(1).max(9).default(1).describe('Number of adult passengers. Default: 1'),
  children: z.number().min(0).max(9).default(0).describe('Number of child passengers. Default: 0'),
  cabins: z
    .array(z.enum(['Economy', 'Premium Economy', 'Business', 'First']))
    .default(['Economy', 'Business'])
    .describe('Cabin classes to search. Default: ["Economy", "Business"]'),
});

export type FlightSearchParams = z.infer<typeof FlightSearchParamsSchema>;

// =============================================================================
// EXPLORER SEARCH API TYPES (new PointsYeah API)
// =============================================================================

export interface ExplorerSearchResult {
  program: string;
  departure_date: string;
  departure: { code: string; city: string; country_name: string };
  arrival: { code: string; city: string; country_name: string };
  miles: number;
  tax: number;
  cabin: string;
  detail_url: string;
  stops: number;
  seats: number;
  duration: number;
  transfer: ExplorerTransferOption[];
}

export interface ExplorerTransferOption {
  bank: string;
  actual_points: number;
  points: number;
}

export interface ExplorerSearchResponse {
  total: number;
  results: ExplorerSearchResult[];
}

export interface ExplorerDetailSegment {
  departure_info: {
    date_time: string;
    airport: { airport_code: string; city_name: string };
  };
  arrival_info: {
    date_time: string;
    airport: { airport_code: string; city_name: string };
  };
  cabin: string;
  flight: { airline_code: string; airline_name: string; number: string };
  aircraft: string;
  duration: number;
}

export interface ExplorerDetailRoute {
  payment: {
    currency: string;
    tax: number;
    miles: number;
    cabin: string;
    unit: string;
    short_unit?: string;
    seats: number;
    cash_price: number;
  };
  segments: ExplorerDetailSegment[];
  duration: number;
  transfer: ExplorerTransferOption[] | null;
  program: string;
  code: string;
  url?: string;
}

export interface ExplorerDetailResponse {
  program: string;
  code: string;
  date: string;
  departure: string;
  arrival: string;
  routes: ExplorerDetailRoute[];
}

// =============================================================================
// NORMALIZED TYPES (used by tool output formatting)
// =============================================================================

export interface FlightSegment {
  duration: number;
  flight_number: string;
  dt: string;
  da: string;
  at: string;
  aa: string;
  cabin: string;
}

export interface TransferOption {
  bank: string;
  actual_points: number;
  points: number;
}

export interface FlightPayment {
  currency: string;
  tax: number;
  miles: number;
  cabin: string;
  unit: string;
  seats: number;
  cash_price: number;
}

export interface FlightRoute {
  payment: FlightPayment;
  segments: FlightSegment[];
  transfer: TransferOption[];
}

export interface FlightResult {
  program: string;
  code: string;
  date: string;
  departure: string;
  arrival: string;
  routes: FlightRoute[];
}

export interface FlightSearchResults {
  total: number;
  results: FlightResult[];
}
