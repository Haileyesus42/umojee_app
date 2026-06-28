export interface Timestamps {
  createdAt: string;
  updatedAt: string;
}

export interface UserRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  code?: string;
  country: string;
  dob?: string;
}

export interface ChangePasswordProps {
  newPassword: string;
  oldPassword: string;
}

export interface ForgotPasswordProps {
  username: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface LoginProp {
  email: string;
  password: string;
  twoFactorCode?: string;
  inviteToken?: string;
}

export interface SignUpProp {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: Date;
  password: string;
  inviteToken?: string;
}

export type Chat = {
  avatar: string;
  name: string;
  text: string;
  time: number;
  textCount: number;
  color: string;
};

export interface EmailTemplate {
  id: string;
  title: string;
  body: string;
  subject: string;
}

export interface Refund {
  id: number;
  passengerName: string;
  passengerEmail: string;
  totalPrice: string;
  bookingDate: string;
  requestDate: string;
  description: string;
  refundStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  accessToken: string | null;
}

export interface userCridentialsProps {
  email: string;
  otp: string;
}

export interface CommonFields {
  _id: string;
  flightNumber: string;
  duration: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureAcronym: string;
  arrivalAcronym: string;
  departureTime: string;
  arrivalTime: string;
  departureDate: string;
  arrivalDate: string;
  stoppageCount: number;
}

export interface Flights extends CommonFields {
  economySeatLeft: number;
  businessSeatLeft: number;
  price: {
    oneway: number;
    roundtrip: number;
    currency: string;
  };
}
export interface Booking extends CommonFields {
  price: number;
  type: string;
}

export interface SearchValuesProps {
  tripType: string;
  bookingType: string;
  departure: string;
  arrival: string;
  departureDate: string;
  returnDate: string;
  passengers: { adult: number; child: number; infant: number };
}

export interface ExtraOptions {
  pricePerBaggage: number;
  totalBaggages: number;
  totalPriceValue: number;
}

export interface PassengerContact {
  code: string;
  phone: string;
  email: string;
  needNotification: boolean;
}

export interface PassengersDetails {
  firstName: string;
  lastName: string;
  title: string;
}

// _id: string;
// seatId: string;
// status: string;
// unsuitableForHandicap: boolean;
// armTrayLeft: boolean;
// armTrayRight: boolean;
// babyHammock?: boolean;
// handicapArmRest?: boolean;
// noBreakOver?: boolean;
// limitedRecline?: boolean;
// noRecline?: boolean;
// hideSeat?: boolean;

export interface SeatPropertyAttributes {
  _id: string;
  seatId: string; // Newly Added
  status: string;
  // status: "available" | "occupied" | "unavailable" | "vip";
  unsuitableForHandicap?: boolean;
  armTrayLeft?: boolean;
  armTrayRight?: boolean;
  babyHammock?: boolean; // false for now
  handicapArmRest?: boolean;
  noBreakOver?: boolean;
  limitedRecline?: boolean; // false for now
  noRecline?: boolean;
  hideSeat?: boolean;
}

export type SeatDescriptionProps = {
  color: string;
  label: string;
};

export type SeatProps = {
  seatData: SeatPropertyAttributes;
  onClick: (id: string) => void;
  isSelected: boolean;
};

export interface NotificationItem {
  _id: string;
  title?: string;
  message: string;
  route: string;
  type?: string;
  seen: boolean;
  createdAt: string;
  imageUrl?: string;
  journeyId?: string;
  metadata?: Record<string, any>;
  actor?: {
    userId?: string;
    name?: string;
    photo?: string;
  } | null;
}
