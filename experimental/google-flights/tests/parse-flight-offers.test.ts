import { describe, it, expect } from 'vitest';
import { parseFlightOffers } from '../shared/build/flights-client/flights-client.js';

// Helper to create a minimal raw offer with the same structure Google uses
function makeRawOffer(opts: {
  airlineCode: string;
  airlineName: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: number[];
  arrivalTime: number[];
  departureDate: number[];
  arrivalDate: number[];
  durationMinutes: number;
  price: number;
  bookingToken?: string;
  isBest?: boolean;
  fareTier?: number | null;
}) {
  const leg = new Array(31).fill(null);
  leg[3] = opts.origin;
  leg[4] = `${opts.origin} Airport`;
  leg[5] = `${opts.destination} Airport`;
  leg[6] = opts.destination;
  leg[8] = opts.departureTime;
  leg[10] = opts.arrivalTime;
  leg[11] = opts.durationMinutes;
  leg[20] = opts.departureDate;
  leg[21] = opts.arrivalDate;
  leg[22] = [
    opts.airlineCode,
    opts.flightNumber.replace(opts.airlineCode, ''),
    null,
    opts.airlineName,
  ];

  const details = new Array(25).fill(null);
  details[0] = opts.airlineCode;
  details[1] = [opts.airlineName];
  details[2] = [leg];
  details[3] = opts.origin;
  details[4] = opts.departureDate;
  details[5] = opts.departureTime;
  details[6] = opts.destination;
  details[7] = opts.arrivalDate;
  details[8] = opts.arrivalTime;
  details[9] = opts.durationMinutes;

  if (opts.fareTier !== undefined && opts.fareTier !== null) {
    details[22] = [null, null, opts.fareTier];
  }

  const raw = new Array(11).fill(null);
  raw[0] = details;
  raw[1] = [[null, opts.price], opts.bookingToken || 'token123'];
  raw[5] = [opts.isBest ? 1 : 0, 0, 0];

  return raw;
}

describe('parseFlightOffers', () => {
  it('should parse flights from ds1[3][0] (other flights section)', () => {
    const ds1 = new Array(10).fill(null);
    ds1[3] = [
      [
        makeRawOffer({
          airlineCode: 'DL',
          airlineName: 'Delta',
          flightNumber: 'DL640',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [8, 30],
          arrivalTime: [16, 13],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 10],
          durationMinutes: 283,
          price: 409,
          fareTier: 1,
        }),
      ],
    ];

    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(1);
    expect(offers[0].price).toBe(409);
    expect(offers[0].airline).toBe('Delta');
    expect(offers[0].segments[0].flight_number).toBe('DL640');
  });

  it('should parse flights from ds1[2][0] (best flights section)', () => {
    const ds1 = new Array(10).fill(null);
    ds1[2] = [
      [
        makeRawOffer({
          airlineCode: 'UA',
          airlineName: 'United',
          flightNumber: 'UA702',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [10, 15],
          arrivalTime: [18, 9],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 10],
          durationMinutes: 294,
          price: 199,
          isBest: true,
          fareTier: 1,
        }),
      ],
    ];

    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(1);
    expect(offers[0].price).toBe(199);
    expect(offers[0].airline).toBe('United');
    expect(offers[0].segments[0].flight_number).toBe('UA702');
    expect(offers[0].is_best).toBe(true);
  });

  it('should merge best flights and other flights from both sections', () => {
    const ds1 = new Array(10).fill(null);

    // Best flights (ds1[2][0])
    ds1[2] = [
      [
        makeRawOffer({
          airlineCode: 'F9',
          airlineName: 'Frontier',
          flightNumber: 'F91448',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [22, 38],
          arrivalTime: [6, 35],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 11],
          durationMinutes: 297,
          price: 94,
          isBest: true,
          fareTier: 1,
        }),
        makeRawOffer({
          airlineCode: 'UA',
          airlineName: 'United',
          flightNumber: 'UA702',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [10, 15],
          arrivalTime: [18, 9],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 10],
          durationMinutes: 294,
          price: 199,
          isBest: true,
          fareTier: 1,
        }),
      ],
    ];

    // Other flights (ds1[3][0])
    ds1[3] = [
      [
        makeRawOffer({
          airlineCode: 'DL',
          airlineName: 'Delta',
          flightNumber: 'DL640',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [8, 30],
          arrivalTime: [16, 13],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 10],
          durationMinutes: 283,
          price: 409,
          fareTier: 1,
        }),
        makeRawOffer({
          airlineCode: 'DL',
          airlineName: 'Delta',
          flightNumber: 'DL635',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [21, 55],
          arrivalTime: [5, 37],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 11],
          durationMinutes: 282,
          price: 199,
          fareTier: 1,
        }),
      ],
    ];

    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(4);

    // All flights from both sections should be present
    const flightNumbers = offers.map((o) => o.segments[0].flight_number);
    expect(flightNumbers).toContain('F91448');
    expect(flightNumbers).toContain('UA702');
    expect(flightNumbers).toContain('DL640');
    expect(flightNumbers).toContain('DL635');

    // Verify is_best flag
    const bestOffer = offers.find((o) => o.segments[0].flight_number === 'UA702');
    expect(bestOffer?.is_best).toBe(true);

    const otherOffer = offers.find((o) => o.segments[0].flight_number === 'DL640');
    expect(otherOffer?.is_best).toBe(false);
  });

  it('should handle missing best flights section gracefully', () => {
    const ds1 = new Array(10).fill(null);
    ds1[3] = [
      [
        makeRawOffer({
          airlineCode: 'DL',
          airlineName: 'Delta',
          flightNumber: 'DL640',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [8, 30],
          arrivalTime: [16, 13],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 10],
          durationMinutes: 283,
          price: 409,
        }),
      ],
    ];

    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(1);
  });

  it('should handle missing other flights section gracefully', () => {
    const ds1 = new Array(10).fill(null);
    ds1[2] = [
      [
        makeRawOffer({
          airlineCode: 'UA',
          airlineName: 'United',
          flightNumber: 'UA702',
          origin: 'SFO',
          destination: 'ATL',
          departureTime: [10, 15],
          arrivalTime: [18, 9],
          departureDate: [2026, 5, 10],
          arrivalDate: [2026, 5, 10],
          durationMinutes: 294,
          price: 199,
          isBest: true,
        }),
      ],
    ];

    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(1);
  });

  it('should handle both sections being empty/null', () => {
    const ds1 = new Array(10).fill(null);
    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(0);
  });

  it('should skip offers without price data', () => {
    const ds1 = new Array(10).fill(null);
    const rawOffer = makeRawOffer({
      airlineCode: 'DL',
      airlineName: 'Delta',
      flightNumber: 'DL640',
      origin: 'SFO',
      destination: 'ATL',
      departureTime: [8, 30],
      arrivalTime: [16, 13],
      departureDate: [2026, 5, 10],
      arrivalDate: [2026, 5, 10],
      durationMinutes: 283,
      price: 409,
    });
    // Remove price
    rawOffer[1] = [[null, null]];

    ds1[3] = [[rawOffer]];

    const offers = parseFlightOffers(ds1, 'USD');
    expect(offers).toHaveLength(0);
  });
});
