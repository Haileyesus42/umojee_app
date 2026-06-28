import { AgentsStateType } from '../interface/agents';
import { BookingSliceType } from '../interface/booking';
import { FlightStateType } from '../interface/flight';
import { PassengerSliceType } from '../interface/passenger';
import { RefundSliceType } from '../interface/refund';
import { SettingSliceType } from '../interface/setting';
import { StaffSliceType } from '../interface/staff';
import { AnnouncementsSliceType, AnnouncementTemplatesSliceType } from '../constants/interface/announcements';
import { AgenciesSliceType } from '../constants/interface/agencies';

export const settingInitialState: SettingSliceType = {};

export const staffInitialState: StaffSliceType = {
  staffList: [],
  isFetchingStaffs: false,
  showNewStaffModal: false,
};

export const flightInitialState: FlightStateType = {
  flightList: [],
  isFetchingFlightList: false,
  filteredFlightsList: [],
  filteredReturnFlightsList: [],
  selectedFlight: null,
  selectedReturnFlight: null,
  searchFlightData: null,
  passengers: [],
  extraOptions: null,
  passengersContact: null,
  showFlightFormModal: false,
  isDeletingFlight: false,
  isArchivingFlight: false,
  isCreatingFlight: false,
  isUpdatingFlight: false,
  selectedFlightIds: [],
  isDeletingAllFlights: false,
  isSearchingDirectFlights: false,
  directFlights: [],
  isSearchingReturnFlights: false,
  returnFlights: [],
};

export const agentsInitialState: AgentsStateType = {
  agentsList: [],
  isFetchingAgents: false,
  isCreatingAgent: false,
  showAddAgentModal: false,
};

export const agenciesInitialState: AgenciesSliceType = {
  agenciesList: [],
  isFetchingAgencies: false,
};

export const bookingInitialState: BookingSliceType = {
  bookingsList: [],
  changed: false,
  isFetchingBookingList: false,
  showBookingFromModal: false,
  showEditBookingModal: false,
  showViewBookingModal: false,
  isCreatingFlightBooking: false,
};

export const passengerInitialState: PassengerSliceType = {
  passengerList: [],
  isFetchingPassengerList: false,
};

export const refundInitialState: RefundSliceType = {
  isFetchingRefunds: false,
  isRequestingRefund: false,
  isApprovingRefund: false,
  refunds: [],
};

export const announcementTemplatesInitialState: AnnouncementTemplatesSliceType = {
  templatesList: [],
  isFetchingTemplates: false,
};

export const announcementsInitialState: AnnouncementsSliceType = {
  announcementsList: [],
  isFetchingAnnouncements: false,
};