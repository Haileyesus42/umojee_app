import { format } from 'date-fns';
import { Booking } from '../types/types';
import { Role } from '../constants/enum';

export const formatBookings = (bookings: Booking[]) =>
  bookings.map((item: any) => ({
    id: item._id,
    passengerName: item.passengers.map((p: any) => p.firstName).join(', '),
    flightNumber: item.flightNumber,
    airline: item.flightId.airline,
    ticketPrice: item.price,
    departureAirport: item.flightId.departureAirport,
    arrivalAirport: item.flightId.arrivalAirport,
    departureTime: format(new Date(item.departureTime), 'MMMM do, yyyy HH:mm'),
    arrivalTime: format(new Date(item.arrivalTime), 'MMMM do, yyyy HH:mm'),
    bookingStatus: item.status,
    totalPeoples: item.passengers.length,
    seatNumber: item.seatNumber,
    createdAt: format(new Date(item.createdAt), 'MMMM do, yyyy'),
    updatedAt: format(new Date(item.updatedAt), 'MMMM do, yyyy'),
  }));

export const hasAdminRole = (role: Role) => role === Role.Admin;
export const hasSupervisorRole = (role: Role) => role === Role.Supervisor;
export const hasManagerRole = (role: Role) => role === Role.Manager;
export const hasSuperAdminRole = (role: Role) => role === Role.SuperAdmin;
export const hasUserRole = (role: Role) => role === Role.User;
export const hasAgentRole = (role: Role) => role === Role.Agent;
