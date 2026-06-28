import { Timestamps } from '.';
import { ExtraOptions, SearchValuesProps } from '../types/types';
import { PassengersContact, PassengersDetails } from './passenger';

export interface FlightStateType {
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
  showFlightFormModal: boolean;
  isDeletingFlight: boolean;
  isArchivingFlight: boolean;
  isCreatingFlight: boolean;
  isUpdatingFlight: boolean;
  selectedFlightIds: string[];
  isDeletingAllFlights: boolean;
  isSearchingDirectFlights: boolean;
  isSearchingReturnFlights: boolean;
  directFlights: Flight[];
  returnFlights: Flight[];
}

export interface Flight extends Timestamps {
  _id: string;
  flightNumber: string;
  airline: string;
  duration: number;
  departureAirport: string;
  arrivalAirport: string;
  departureAirportAcronym: string;
  arrivalAirportAcronym: string;
  departureTime: string;
  arrivalTime: string;
  flightStatus: string;
  price: {
    currency: string;
    oneway: number;
    roundtrip?: number;
  };
  gate?: string;
  terminal?: string;

  runway?: string;
  TotalSeatsCapacity: number;
  seatsLeft: number;
  stoppageCount: number;
}

interface SelectFlightProps extends Flight {
  totalPassengers: string;
  totalPrice: number;
}
