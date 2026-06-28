import {
  ExtraOptions,
  PassengersContact,
  PassengersDetails,
  SearchValuesProps,
  Timestamps,
} from '../../types/types';

export interface flightStateType {
  flightList: Flight[];
  isFetchingFlightList: boolean;
  filteredFlightsList: Flight[];
  filteredReturnFlightsList: Flight[];
  selectedFlight: SelectFlightProps | null;
  selectedReturnFlight: SelectFlightProps | null;
  searchFlightData: SearchValuesProps | null;
  passengers: PassengersDetails[];
  extraOptions: ExtraOptions | null;
  passengersContact: PassengersContact | null;
}

export interface EditFlightProps {
  id: string;
  flightNumber: string;
  airline: string;
  duration: string;
  TotalSeatsCapacity: number;
  // economySeatLeft: number;
  // businessSeatLeft: number;
  seatsLeft: number;
  departureAirport: string;
  arrivalAirport: string;
  departureAirportAcronym: string;
  arrivalAirportAcronym: string;
  departureTime: string;
  arrivalTime: string;
  stoppageCount: number;
  flightStatus: string;
  price: {
    currency: string;
    oneway: number;
    roundtrip?: number;
  };
  gate?: string;
  terminal?: string;
  runway?: string;
}

export interface Flight extends EditFlightProps, Timestamps {}

interface SelectFlightProps extends Flight {
  totalPassengers: string;
  totalPrice: number;
}
