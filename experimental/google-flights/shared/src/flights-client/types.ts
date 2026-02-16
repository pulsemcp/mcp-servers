export interface FlightSegment {
  flight_number: string;
  airline: string;
  airline_code: string;
  operated_by: string | null;
  aircraft: string | null;
  origin: string;
  origin_name: string;
  destination: string;
  destination_name: string;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  duration_minutes: number;
  legroom: string | null;
}

export interface FlightOffer {
  price: number;
  currency: string;
  airline: string;
  airline_code: string;
  is_best: boolean;
  departure: string;
  arrival: string;
  departure_date: string;
  arrival_date: string;
  duration_minutes: number;
  stops: number;
  segments: FlightSegment[];
  booking_token: string;
}

export interface DateGridEntry {
  date: string;
  price: number;
}

export interface DateGridResult {
  date_grid: DateGridEntry[];
  cheapest: DateGridEntry | null;
  currency: string;
}

export interface AirportResult {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface SearchFlightsOptions {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  trip_type: 'one_way' | 'round_trip';
  seat_class: 'economy' | 'premium_economy' | 'business' | 'first';
  adults: number;
  children: number;
  infants_in_seat: number;
  infants_on_lap: number;
  max_stops: 'any' | 'nonstop' | '1' | '2';
  sort_by: 'best' | 'price' | 'duration' | 'departure' | 'arrival';
  max_results: number;
  offset: number;
  currency: string;
}

export interface SearchFlightsResult {
  query: {
    origin: string;
    destination: string;
    departure_date: string;
    return_date?: string;
    trip_type: string;
    seat_class: string;
    passengers: {
      adults: number;
      children: number;
      infants_in_seat: number;
      infants_on_lap: number;
    };
  };
  total_results: number;
  showing: { offset: number; count: number };
  flights: FlightOffer[];
}

export interface GetDateGridOptions {
  origin: string;
  destination: string;
  departure_date?: string;
  trip_type: 'one_way' | 'round_trip';
  seat_class: 'economy' | 'premium_economy' | 'business' | 'first';
  adults: number;
  currency: string;
}

export type SeatClass = 'economy' | 'premium_economy' | 'business' | 'first';
export type TripType = 'one_way' | 'round_trip';
