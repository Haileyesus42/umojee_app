import { format } from 'date-fns';
import { Agent } from '../interface/agents';
import { Booking } from '../interface/booking';
import { Passenger } from '../interface/passenger';
import { Staff } from '../interface/staff';
import moment from 'moment';

export const formatBookings = (bookings: Booking[]) =>
  bookings.map((item: any) => ({
    _id: item._id,
    passengerName: item.passengers.map((p: any) => p.firstName).join(', '),
    flightNumber: item.flightNumber,
    airline: item.flightData ? item.flightData.airline : 'No flight ID!',
    ticketPrice: item.price,
    departureAirport: item.flightData
      ? item.flightData.departureAirport
      : 'No flight ID!',
    arrivalAirport: item.flightData
      ? item.flightData.arrivalAirport
      : 'No flight ID!',
    departureTime: format(new Date(item.departureTime), 'MMMM do, yyyy HH:mm'),
    arrivalTime: format(new Date(item.arrivalTime), 'MMMM do, yyyy HH:mm'),
    bookingStatus: item.status,
    totalPeoples: item.passengers.length,
    seatNumber: item.seatNumber,
    gate: item.gate,
    terminal: item.terminal,
    runway: item.runway,
    createdAt: moment(item.createdAt).toISOString(),
    updatedAt: format(new Date(item.updatedAt), 'MMMM do, yyyy'),
    status: item.status,
    userId: item?.userId?._id,
  }));

export const formattedAgents = (agents: Agent[]) =>
  agents.map((item: any) => ({
    id: item._id,
    agentsName: item.agentsName,
    agentsEmail: item.agentsEmail,
    agentsAddress: item.agentsAddress,
    agentsPhone: item.agentsPhone,
    description: item.description,
    totalAgents: item.totalAgents,
    agentsStatus: item.agentsStatus,
    createdAt: format(new Date(item.createdAt), 'MMMM do, yyyy'),
    updatedAt: format(new Date(item.updatedAt), 'MMMM do, yyyy'),
  }));

export const formattedPassengers = (passengers: Passenger[]) =>
  passengers.map((item: any) => ({
    ...item,
    _id: item._id,
    status: item.isBlocked ? 'BLOCKED' : 'ACTIVE',
    createdAt: format(new Date(item.createdAt || '10001'), 'MMMM do, yyyy'),
    updatedAt: format(new Date(item.updatedAt || '10001'), 'MMMM do, yyyy'),
  }));

export const formattedStaffs = (staffList: Staff[]) =>
  staffList?.map((item: any) => ({
    _id: item._id,
    name: item.name,
    email: item.email,
    active: item.active,
    status: item.active ? 'ACTIVE' : 'BLOCKED',
    role: item.role,
    createdAt: format(new Date(item.createdAt || '10001'), 'MMMM do, yyyy'),
    updatedAt: format(new Date(item.updatedAt || '10001'), 'MMMM do, yyyy'),
  }));

export const convertToDate = (dateString: string) => {
  const cleanedDateString = dateString.replace(/(\d{1,2})(st|nd|rd|th)/, '$1');
  return new Date(cleanedDateString);
};
