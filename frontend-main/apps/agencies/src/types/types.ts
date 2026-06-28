import { Timestamps } from '../interface';

export interface ReportType {
  status: string;
  totalData: number;
}

export interface UserRequest {
  email: string;
  password: string;
  fullName: string;
  roleName?: string;
}

export interface NewAgency {
  email: string;
  role: string;
  password?: string;
  name: string;
}

export interface AddAgency {
  agenciesName: string;
  agenciesEmail: string;
  agenciesPhone: string;
  agenciesAddress: string;
  description: string;
  totalAgents: number;
  agenciesStatus: string;
}
export interface EditAgency {
  agencyName: string;
  agencyEmail: string;
  agencyPhone: string;
  agencyAddress: string;
  description: string;
  countryCode: string;
  totalAgents: number;
  agencyStatus: string;
}
export interface AddAgent {
  agentsName: string;
  agentsEmail: string;
  agentsPhone: string;
  agentsAddress: string;
  description: string;
  agentsRole: string;
  agentsStatus: string;
  agentsAgency: string;
  password?: string;
}
export interface ChangePasswordProps {
  password: string;
  oldPassword: string;
  userId?:string
}

export interface ForgotPasswordProps {
  username: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface Login {
  email: string;
  password: string;
}

export type Chat = {
  avatar: string;
  name: string;
  text: string;
  time: number;
  textCount: number;
  color: string;
};

export type BRAND = {
  logo: string;
  name: string;
  visitors: number;
  revenues: string;
  sales: string;
  conversion: number;
};

export type Package = {
  name: string;
  price: number;
  invoiceDate: string;
  status: string;
};

export interface Role extends Timestamps {
  id: number;
  roleName: string;
  authorities: PermissionTemplate[];
}

export interface PermissionTemplate {
  id: number;
  resource: string;
  action: string;
  description: string;
  authority: string;
}

export interface MessageTemplate {
  name: string;
  title: string;
  body: string;
}
export interface AnnMessageTemplate {
  templateName: string;
  templateTitle: string;
  templateBody: string;
}

export interface EmailTemplate {
  id: string;
  title: string;
  body: string;
  subject: string;
}

export interface NotificationState {
  message: any;
  type: any;
  open: any;
}

export interface ViewPassengerProps {
  id: number;
  passengerName: string;
  passengerEmail: string;
  passengerStatus: string;
  isBlocked: string;
}

export interface userCridentialsProps {
  email: string;
  password: string;
}

export interface AgenciesTypes extends Timestamps {
  id: number;
  agenciesName: string;
  agenciesEmail: string;
  agenciesPhone: string;
  agenciesAddress: string;
  description: string;
  totalAgents: number;
  agenciesStatus: string;
}

export interface ViewAgentsProps {
  id: string;
  agentsName: string;
  agentsEmail: string;
  agentsStatus: string;
}

export interface AnnouncementTypes {
  id: number;
  anncName: string;
  anncEmail: string;
  anncPhone: string;
  anncRole: string;
  anncStatus: string;
}
export interface AnnouncementDataProps {
  users: AnnouncementTypes[];
  message: MessageTemplate;
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

export interface Booking extends EditBookingProps, Timestamps {
  totalPeoples: number;
  ticketPrice: number;
}

export interface EditBookingProps {
  id: string;
  passengerName: string;
  flightNumber: string;
  airline: string;
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  bookingStatus: string;
  seatNumber: string;
}

interface TransactionStats {
  currentMonthCount: number;
  lastMonthCount: number;
  percentageIncrease: number;
}

export interface DashboardCardsData {
  booked: TransactionStats;
  refundApproved: TransactionStats;
  requestRefund: TransactionStats;
  ticketed: TransactionStats;
  status: string;
}

export interface PieChartType {
  totalCancelled: number;
  totalDelayed: number;
  totalOnTime: number;
}

export interface PieChartData {
  todayData: PieChartType;
  totalData: PieChartType;
  weekData: PieChartType;
}

export interface TodayBookingData {
  ticketedBookingsCount: number;
  bookedBookingsCount: number;
  refundRequestes: number;
  approvedRefunds: number;
}

export interface AllBookingsType {
  departureTime: string;
  arrivalTime: string;
  arrivalAirport: string;
  departureAirport: string;
  arrivalAirportAcronym: string;
  departureAirportAcronym: string;
  totalPassengers: number;
}

export interface LineChartType {
  cancelled: number;
  day: number;
  delayed: number;
  month: number;
  onTime: number;
  year: number;
}

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

export interface Notification {
  createdAt: string;
  message: string;
  route: string;
  seen: boolean;
  updatedAt: string;
  _id: string;
}
