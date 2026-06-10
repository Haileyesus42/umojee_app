import { createAmadeusFlightOrder, deleteAmadeusBookingById, getAllAmadeusBookings, getAmadeusBookingByOrderId, getAmadeusBookingByReference, getAmadeusBookingsByUserAndConversation, saveAmadeusFlightBooking, getFlightSeatMap, getFlightSeatMapByOrderId, updateBookingSeats } from '../../controller/AI_Bot/amadeus.controller';
import express from 'express';

export const amadeusRouter = express.Router();

amadeusRouter.post('/booking/create', createAmadeusFlightOrder);
amadeusRouter.post('/booking/seatmap', getFlightSeatMap);
amadeusRouter.get('/booking/seatmap/:orderId', getFlightSeatMapByOrderId);
amadeusRouter.patch('/booking/:bookingId/seats', updateBookingSeats);
amadeusRouter.post('/booking/save', saveAmadeusFlightBooking);
amadeusRouter.get('/booking/reference/:referenceNumber', getAmadeusBookingByReference);
amadeusRouter.get('/booking/getall', getAllAmadeusBookings);
amadeusRouter.get('/booking/by-user', getAmadeusBookingsByUserAndConversation);
amadeusRouter.get('/booking/:orderId', getAmadeusBookingByOrderId);
amadeusRouter.delete('/booking/:id', deleteAmadeusBookingById);
