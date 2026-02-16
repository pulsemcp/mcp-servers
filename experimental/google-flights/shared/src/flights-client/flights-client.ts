import protobuf from 'protobufjs';
import type {
  FlightOffer,
  FlightSegment,
  DateGridEntry,
  DateGridResult,
  SearchFlightsOptions,
  SearchFlightsResult,
  GetDateGridOptions,
  AirportResult,
  SeatClass,
  TripType,
} from './types.js';
import { logDebug } from '../logging.js';

// Protobuf enum mappings
const SEAT_MAP: Record<SeatClass, number> = {
  economy: 1,
  premium_economy: 2,
  business: 3,
  first: 4,
};

const TRIP_MAP: Record<TripType, number> = {
  round_trip: 1,
  one_way: 2,
};

// Default headers to mimic a Chrome browser
const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  Cookie: 'CONSENT=PENDING+987; SOCS=CAESHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmRlIAEaBgiAo_CmBg',
};

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1500;

async function rateLimitedFetch(url: string): Promise<string> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  const response = await fetch(url, { headers: DEFAULT_HEADERS });
  if (!response.ok) {
    throw new Error(`Google Flights returned HTTP ${response.status}`);
  }
  return response.text();
}

// =============================================================================
// PROTOBUF ENCODING
// =============================================================================

let protoRoot: protobuf.Root | null = null;

function getProtoRoot(): protobuf.Root {
  if (protoRoot) return protoRoot;

  // Define protobuf schema programmatically (avoids needing .proto file at runtime)
  const root = new protobuf.Root();

  const Airport = new protobuf.Type('Airport').add(new protobuf.Field('airport', 2, 'string'));

  const FlightData = new protobuf.Type('FlightData')
    .add(new protobuf.Field('date', 2, 'string'))
    .add(new protobuf.Field('maxStops', 9, 'int32', 'optional'))
    .add(new protobuf.Field('fromFlight', 13, 'Airport'))
    .add(new protobuf.Field('toFlight', 14, 'Airport'));

  const Seat = new protobuf.Enum('Seat', {
    UNKNOWN_SEAT: 0,
    ECONOMY: 1,
    PREMIUM_ECONOMY: 2,
    BUSINESS: 3,
    FIRST: 4,
  });

  const Trip = new protobuf.Enum('Trip', {
    UNKNOWN_TRIP: 0,
    ROUND_TRIP: 1,
    ONE_WAY: 2,
    MULTI_CITY: 3,
  });

  const Passenger = new protobuf.Enum('Passenger', {
    UNKNOWN_PASSENGER: 0,
    ADULT: 1,
    CHILD: 2,
    INFANT_IN_SEAT: 3,
    INFANT_ON_LAP: 4,
  });

  const Info = new protobuf.Type('Info')
    .add(new protobuf.Field('seat', 1, 'Seat'))
    .add(new protobuf.Field('data', 3, 'FlightData', 'repeated'))
    .add(new protobuf.Field('passengers', 6, 'Passenger', 'repeated'))
    .add(new protobuf.Field('trip', 19, 'Trip'));

  root.add(Airport);
  root.add(FlightData);
  root.add(Seat);
  root.add(Trip);
  root.add(Passenger);
  root.add(Info);

  protoRoot = root;
  return root;
}

export async function buildTfsParam(options: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: TripType;
  seatClass: SeatClass;
  adults: number;
  children: number;
  infantsInSeat: number;
  infantsOnLap: number;
  maxStops?: number;
}): Promise<string> {
  const root = getProtoRoot();
  const Info = root.lookupType('Info');

  // Build passenger list
  const passengers: number[] = [];
  for (let i = 0; i < options.adults; i++) passengers.push(1); // ADULT
  for (let i = 0; i < options.children; i++) passengers.push(2); // CHILD
  for (let i = 0; i < options.infantsInSeat; i++) passengers.push(3);
  for (let i = 0; i < options.infantsOnLap; i++) passengers.push(4);

  // Build flight legs
  const flightData: protobuf.Message[] = [];

  const outboundLeg: Record<string, unknown> = {
    date: options.departureDate,
    fromFlight: { airport: options.origin },
    toFlight: { airport: options.destination },
  };
  if (options.maxStops !== undefined) {
    outboundLeg.maxStops = options.maxStops;
  }
  flightData.push(outboundLeg as unknown as protobuf.Message);

  // Return leg for round trips
  if (options.tripType === 'round_trip' && options.returnDate) {
    const returnLeg: Record<string, unknown> = {
      date: options.returnDate,
      fromFlight: { airport: options.destination },
      toFlight: { airport: options.origin },
    };
    if (options.maxStops !== undefined) {
      returnLeg.maxStops = options.maxStops;
    }
    flightData.push(returnLeg as unknown as protobuf.Message);
  }

  const message = Info.create({
    data: flightData,
    seat: SEAT_MAP[options.seatClass],
    passengers,
    trip: TRIP_MAP[options.tripType],
  });

  const buffer = Info.encode(message).finish();
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// =============================================================================
// HTML FETCHING & PARSING
// =============================================================================

function buildFlightsUrl(tfs: string, currency: string): string {
  const url = new URL('https://www.google.com/travel/flights');
  url.searchParams.set('tfs', tfs);
  url.searchParams.set('hl', 'en');
  url.searchParams.set('tfu', 'EgQIABABIgA');
  url.searchParams.set('curr', currency);
  return url.toString();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractDs1(html: string): any | null {
  const marker = "AF_initDataCallback({key: 'ds:1'";
  const start = html.indexOf(marker);
  if (start === -1) return null;

  const dataStart = html.indexOf('data:', start) + 5;
  let depth = 0;
  for (let i = dataStart; i < html.length; i++) {
    if (html[i] === '[' || html[i] === '{') depth++;
    if (html[i] === ']' || html[i] === '}') depth--;
    if (depth === 0) {
      try {
        return JSON.parse(html.substring(dataStart, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function formatTime(timeArr: number[] | null | undefined): string {
  if (!timeArr || timeArr.length === 0) return '';
  const hour = timeArr[0];
  const minute = timeArr.length > 1 ? timeArr[1] : 0;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDate(dateArr: number[] | null | undefined): string {
  if (!dateArr || dateArr.length < 3) return '';
  return `${dateArr[0]}-${String(dateArr[1]).padStart(2, '0')}-${String(dateArr[2]).padStart(2, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSegment(leg: any[]): FlightSegment | null {
  if (!leg) return null;

  const flightInfo = leg[22]; // [carrier_code, flight_number, null, marketing_carrier]

  return {
    flight_number: flightInfo ? `${flightInfo[0]}${flightInfo[1]}` : '',
    airline: flightInfo?.[3] || '',
    airline_code: flightInfo?.[0] || '',
    operated_by: leg[2] || null,
    aircraft: leg[17] || null,
    origin: leg[3] || '',
    origin_name: leg[4] || '',
    destination: leg[6] || '',
    destination_name: leg[5] || '',
    departure: formatTime(leg[8]),
    arrival: formatTime(leg[10]),
    departure_date: formatDate(leg[20]),
    arrival_date: formatDate(leg[21]),
    duration_minutes: leg[11] || 0,
    legroom: leg[30] || leg[14] || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFlightOffers(ds1: any, currency: string): FlightOffer[] {
  const offers: FlightOffer[] = [];

  if (!ds1?.[3]?.[0] || !Array.isArray(ds1[3][0])) return offers;

  const rawOffers = ds1[3][0];

  for (const raw of rawOffers) {
    try {
      const details = raw[0];
      const priceData = raw[1];
      const rankData = raw[5]; // [is_best (1/0), ?, ?]

      if (!details || !priceData) continue;

      // Parse segments
      const segments: FlightSegment[] = [];
      const legs = details[2];
      if (Array.isArray(legs)) {
        for (const leg of legs) {
          const segment = parseSegment(leg);
          if (segment) segments.push(segment);
        }
      }

      const price = priceData[0]?.[1];
      if (price === undefined || price === null) continue;

      offers.push({
        price,
        currency,
        airline: details[1]?.[0] || '',
        airline_code: details[0] || '',
        is_best: rankData?.[0] === 1,
        departure: formatTime(details[5]),
        arrival: formatTime(details[8]),
        departure_date: formatDate(details[4]),
        arrival_date: formatDate(details[7]),
        duration_minutes: details[9] || 0,
        stops: segments.length > 0 ? segments.length - 1 : 0,
        segments,
        booking_token: priceData[1] || '',
      });
    } catch (e) {
      logDebug('parseFlightOffers', `Skipping malformed offer: ${(e as Error).message}`);
    }
  }

  return offers;
}

function sortOffers(offers: FlightOffer[], sortBy: SearchFlightsOptions['sort_by']): FlightOffer[] {
  const sorted = [...offers];

  switch (sortBy) {
    case 'price':
      sorted.sort((a, b) => a.price - b.price);
      break;
    case 'duration':
      sorted.sort((a, b) => a.duration_minutes - b.duration_minutes);
      break;
    case 'departure':
      sorted.sort((a, b) => a.departure.localeCompare(b.departure));
      break;
    case 'arrival':
      sorted.sort((a, b) => a.arrival.localeCompare(b.arrival));
      break;
    case 'best':
    default:
      // Google's default ordering: best flights first, then others
      sorted.sort((a, b) => {
        if (a.is_best && !b.is_best) return -1;
        if (!a.is_best && b.is_best) return 1;
        return a.price - b.price;
      });
      break;
  }

  return sorted;
}

function filterByStops(
  offers: FlightOffer[],
  maxStops: SearchFlightsOptions['max_stops']
): FlightOffer[] {
  if (maxStops === 'any') return offers;

  const maxStopsNum = maxStops === 'nonstop' ? 0 : parseInt(maxStops, 10);

  return offers.filter((o) => o.stops <= maxStopsNum);
}

// =============================================================================
// PUBLIC API
// =============================================================================

export async function searchFlights(options: SearchFlightsOptions): Promise<SearchFlightsResult> {
  // Note: max_stops filtering is done client-side after parsing results.
  // Sending maxStops=0 in the protobuf can cause Google to return empty results.
  const tfs = await buildTfsParam({
    origin: options.origin,
    destination: options.destination,
    departureDate: options.departure_date,
    returnDate: options.return_date,
    tripType: options.trip_type,
    seatClass: options.seat_class,
    adults: options.adults,
    children: options.children,
    infantsInSeat: options.infants_in_seat,
    infantsOnLap: options.infants_on_lap,
  });

  const url = buildFlightsUrl(tfs, options.currency);
  const html = await rateLimitedFetch(url);

  // Check for hard blocks
  if (
    html.includes('unusual traffic') ||
    html.includes('Please show you&#39;re not a robot') ||
    html.includes('sorry/index')
  ) {
    throw new Error(
      'Google is rate-limiting requests. Please wait a few minutes before trying again.'
    );
  }

  const ds1 = extractDs1(html);
  if (!ds1) {
    throw new Error(
      'Failed to parse Google Flights response. The page structure may have changed.'
    );
  }

  let allOffers = parseFlightOffers(ds1, options.currency);

  // Apply client-side stop filter (supplements the protobuf filter)
  allOffers = filterByStops(allOffers, options.max_stops);

  // Sort
  allOffers = sortOffers(allOffers, options.sort_by);

  const totalResults = allOffers.length;

  // Paginate
  const paginated = allOffers.slice(options.offset, options.offset + options.max_results);

  return {
    query: {
      origin: options.origin,
      destination: options.destination,
      departure_date: options.departure_date,
      return_date: options.return_date,
      trip_type: options.trip_type,
      seat_class: options.seat_class,
      passengers: {
        adults: options.adults,
        children: options.children,
        infants_in_seat: options.infants_in_seat,
        infants_on_lap: options.infants_on_lap,
      },
    },
    total_results: totalResults,
    showing: {
      offset: options.offset,
      count: paginated.length,
    },
    has_more: options.offset + paginated.length < totalResults,
    next_offset:
      options.offset + paginated.length < totalResults ? options.offset + paginated.length : null,
    flights: paginated,
  };
}

export async function getDateGrid(options: GetDateGridOptions): Promise<DateGridResult> {
  // We need to make a search request to get the date grid data
  // The date grid is embedded in the same response as flight results
  const anchorDate =
    options.departure_date ||
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const tfs = await buildTfsParam({
    origin: options.origin,
    destination: options.destination,
    departureDate: anchorDate,
    tripType: options.trip_type,
    seatClass: options.seat_class,
    adults: options.adults,
    children: 0,
    infantsInSeat: 0,
    infantsOnLap: 0,
  });

  const url = buildFlightsUrl(tfs, options.currency);
  const html = await rateLimitedFetch(url);

  const ds1 = extractDs1(html);
  if (!ds1) {
    throw new Error(
      'Failed to parse Google Flights response. The page structure may have changed.'
    );
  }

  const dateGrid: DateGridEntry[] = [];

  // Date grid is at ds1[5][10][0] — array of [timestamp_ms, price] pairs
  const calendarData = ds1?.[5]?.[10]?.[0];
  if (Array.isArray(calendarData)) {
    for (const entry of calendarData) {
      if (Array.isArray(entry) && entry.length >= 2) {
        const timestamp = entry[0];
        const price = entry[1];
        if (typeof timestamp === 'number' && typeof price === 'number') {
          const date = new Date(timestamp).toISOString().split('T')[0];
          dateGrid.push({ date, price });
        }
      }
    }
  }

  // Find cheapest
  let cheapest: DateGridEntry | null = null;
  for (const entry of dateGrid) {
    if (!cheapest || entry.price < cheapest.price) {
      cheapest = entry;
    }
  }

  return {
    date_grid: dateGrid,
    cheapest,
    currency: options.currency,
  };
}

export async function findAirportCode(query: string): Promise<AirportResult[]> {
  // Use Google Flights search page to look up airports
  // We search for flights from the query location to extract airport data from the response
  const searchQuery = encodeURIComponent(query);
  const url = `https://www.google.com/travel/flights?q=${searchQuery}&hl=en`;

  const html = await rateLimitedFetch(url);

  const results: AirportResult[] = [];
  const seen = new Set<string>();
  let match;

  // Strategy 1: Extract from AF_initDataCallback data
  // Airport entries appear as: ["SFO",0],"San Francisco International Airport"
  // Also broader: ["SFO",0],"Name" followed by city/country data
  const airportPattern =
    /\["([A-Z]{3})",\d+\],"([^"]+(?:Airport|Aeropuerto|Aéroport|Flughafen)[^"]*)"/g;

  while ((match = airportPattern.exec(html)) !== null) {
    const code = match[1];
    if (seen.has(code)) continue;
    seen.add(code);

    const name = match[2];

    // Try to extract city from the nearby context
    const contextStart = Math.max(0, match.index - 500);
    const contextEnd = Math.min(html.length, match.index + match[0].length + 500);
    const context = html.substring(contextStart, contextEnd);

    // Look for city/country info near the airport entry
    const cityMatch = context.match(new RegExp(`"${code}"[^]]*?"(/m/[^"]+)"[^]]*?"([^"]+)"`));
    const city = cityMatch?.[2] || '';

    // Look for country code
    const countryMatch = context.match(/"([A-Z]{2})"/);
    const country = countryMatch?.[1] || '';

    results.push({ code, name, city, country });
  }

  // Strategy 2: Extract from data-code HTML attributes with nearby airport names
  if (results.length === 0) {
    const dataCodePattern = /data-code="([A-Z]{3})"/g;
    while ((match = dataCodePattern.exec(html)) !== null) {
      const code = match[1];
      if (seen.has(code)) continue;
      seen.add(code);

      // Look for the airport name near this data-code attribute
      const contextStart = Math.max(0, match.index - 200);
      const contextEnd = Math.min(html.length, match.index + 500);
      const context = html.substring(contextStart, contextEnd);

      // Airport name often appears in aria-label or nearby text
      const nameMatch = context.match(/aria-label="([^"]*Airport[^"]*)"/);
      const name = nameMatch?.[1] || code;

      results.push({ code, name, city: '', country: '' });
    }
  }

  // Strategy 3: Extract airport codes and names from the structured JS data
  // Google embeds autocomplete data in script tags
  if (results.length === 0) {
    // Look for patterns like "ibnC6b" data-code="XXX" elements
    // and also for ["XXX","Airport Name"] patterns in scripts
    const jsPattern = /\["([A-Z]{3})","([^"]*(?:International|Airport|Regional|Municipal)[^"]*)"/g;
    while ((match = jsPattern.exec(html)) !== null) {
      const code = match[1];
      if (seen.has(code)) continue;
      seen.add(code);
      results.push({ code, name: match[2], city: '', country: '' });
    }
  }

  // Strategy 4: If still nothing, try making a flight search FROM the query to extract airport data
  if (results.length === 0) {
    // Build a search URL with the query as origin using a common destination
    const tfs = await buildTfsParam({
      origin: query.length === 3 ? query.toUpperCase() : 'SFO',
      destination: query.length === 3 ? 'LAX' : query.length <= 3 ? query.toUpperCase() : 'LAX',
      departureDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tripType: 'one_way',
      seatClass: 'economy',
      adults: 1,
      children: 0,
      infantsInSeat: 0,
      infantsOnLap: 0,
    });

    const searchUrl = buildFlightsUrl(tfs, 'USD');
    const searchHtml = await rateLimitedFetch(searchUrl);

    // Extract all airport references from the search results
    const allAirportPattern =
      /\["([A-Z]{3})",\d+\],"([^"]*(?:Airport|Aeropuerto|Aéroport|Flughafen|International|Regional)[^"]*)"/g;
    while ((match = allAirportPattern.exec(searchHtml)) !== null) {
      const code = match[1];
      if (seen.has(code)) continue;
      seen.add(code);

      const name = match[2];
      const contextStart = Math.max(0, match.index - 500);
      const contextEnd = Math.min(searchHtml.length, match.index + match[0].length + 500);
      const context = searchHtml.substring(contextStart, contextEnd);

      const cityMatch = context.match(new RegExp(`"${code}"[^]]*?"(/m/[^"]+)"[^]]*?"([^"]+)"`));
      const city = cityMatch?.[2] || '';
      const countryMatch = context.match(/"([A-Z]{2})"/);
      const country = countryMatch?.[1] || '';

      results.push({ code, name, city, country });
    }
  }

  // Score and sort results by relevance to the query
  const queryLower = query.toLowerCase();
  const scored = results.map((r) => {
    let score = 0;
    if (r.code.toLowerCase() === queryLower) score += 100;
    if (r.code.toLowerCase().includes(queryLower)) score += 50;
    if (r.name.toLowerCase().includes(queryLower)) score += 30;
    if (r.city.toLowerCase().includes(queryLower)) score += 40;
    if (r.country.toLowerCase().includes(queryLower)) score += 10;
    return { ...r, score };
  });

  // Filter to only relevant results (score > 0) unless we have no matches
  const relevant = scored.filter((r) => r.score > 0);
  const finalResults = relevant.length > 0 ? relevant : scored;

  finalResults.sort((a, b) => b.score - a.score);

  return finalResults.map(({ score: _score, ...rest }) => rest);
}

// For testing: export the internal parser
export { extractDs1, parseFlightOffers, formatTime, formatDate };
