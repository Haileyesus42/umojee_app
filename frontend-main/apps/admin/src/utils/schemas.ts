import * as z from 'zod';

export const FlightFormSchema = z
  .object({
    id: z.string().optional(),
    flightNumber: z.string().min(1, 'Flight number is requred'),
    duration: z.number().min(1, 'Duration is requred'),
    airline: z.string().min(1, 'Airline is requred'),
    TotalSeatsCapacity: z.number().min(1, 'Capacity is requred').optional(),
    stoppageCount: z.number().min(0, 'Stoppage count is requred'),
    departureAirport: z.string().min(1, 'Departure airport is requred'),
    arrivalAirport: z.string().min(1, 'Arrival airport is requred'),
    departureAirportAcronym: z.string().optional(),
    arrivalAirportAcronym: z.string().optional(),
    departureTime: z.date().min(new Date(1), 'Departure time is requred'),
    arrivalTime: z.date().min(new Date(1), 'Arrival time is requred'),
    flightStatus: z.string().min(1, 'Flight status is requred'),
    price: z.object({
      currency: z.string().min(1, 'Currency is requred'),
      oneway: z.number().min(0, 'Economy price is requred'),
      roundtrip: z.number().optional(),
    }),
    gate: z.string().optional(),
    terminal: z.string().optional(),
    runway: z.string().optional(),
  })
  .refine((data) => data.departureAirport != data.arrivalAirport, {
    message: 'Please select different cities',
    path: ['arrivalAirport'],
  });

export const SearchFlightsSchema = z.object({
  date: z.object({ start: z.string(), end: z.string() }),
  departureCity: z.string(),
  arrivalCity: z.string(),
});
