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

// =============================================================================
// LIVE SEARCH API TYPES (api2.pointsyeah.com task-based search)
// =============================================================================

export interface FlightSearchTask {
  task_id: string;
  total_sub_tasks: number;
  status: string;
}

export interface FlightSearchResponse {
  code: number;
  success: boolean;
  data: {
    result: FlightResult[] | null;
    status: string; // "processing" | "done"
  };
}
