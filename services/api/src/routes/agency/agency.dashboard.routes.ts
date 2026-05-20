import { deleteFlightStatusById, getFlightsStatus, getFlightStatusPiechart, getYearlyFlightStatus } from '../../controller/admin/dashboardCards/flightStatusChart';
import { countTodayBookingStatuses, getAllBookingForCard, getBookings } from '../../controller/admin/dashboardCards/bookingCards';
import express from 'express';

export const CardsRouter = express.Router(); // Define a separate router for flight routes
CardsRouter.get('/bookings/getall', getBookings);
CardsRouter.get('/bookings/allbookings', getAllBookingForCard);
CardsRouter.get('/bookings/status/today', countTodayBookingStatuses);
CardsRouter.get('/flights/status/getall', getFlightsStatus);
CardsRouter.get('/flights/monthlystatus/getall/:year', getYearlyFlightStatus);
CardsRouter.get('/flights/status/piechart', getFlightStatusPiechart);
CardsRouter.delete('/flights/status/delete/:id', deleteFlightStatusById);