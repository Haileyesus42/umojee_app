import { Timestamps } from './';

export interface BookingSliceType {
  bookingsList: Booking[];
  changed: boolean;
  selectedBooking?: Booking;
  isFetchingBookingList: boolean;
  showBookingFromModal: boolean;
  showEditBookingModal: boolean;
  showViewBookingModal: boolean;
  isCreatingFlightBooking: boolean;
}

export interface Booking extends EditBookingProps, Timestamps {
  totalPeoples: number;
  ticketPrice: number;
}

export interface EditBookingProps {
  _id: string;
  passengerName: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  bookingStatus: string;
  seatNumber: string;
  status?: string;
  userId: string;
}

export interface CreatingFlightBookingPayload {
  flightId: string;
  returnFlightId?: string;
  passengers: { title: string; firstName: string; lastName: string }[];
  totalBaggages: number;
  tripType: string;
  email?: string;
}
