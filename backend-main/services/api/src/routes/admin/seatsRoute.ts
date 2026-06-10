import express from 'express';
import { validateSeatCreation } from '../../middleware/validateSeatCreation';
import { createSeat, deleteSeat, getAllSeats, updateSeats } from '../../controller/seats.controller';
import { createSeatFlight, createSeatFlightById, deleteAllSeatFlights, getAllSeatsByFlightId, getAllSeatsWithAllFlightId, resetSeatsStatus, updateAllOccupiedSeatsToAvailableAndAdjustSeatsLeft, updateSeatsFlight } from '../../controller/seatsFlight.controller';
import { getAllSeatsByBookingId } from '../../controller/admin/booking.controller';

export const seatsRouter = express.Router();
seatsRouter.post('/create', validateSeatCreation, createSeat);
seatsRouter.get('/getall', getAllSeats);
seatsRouter.patch('/update', updateSeats);
seatsRouter.delete('/delete', deleteSeat);

seatsRouter.get('/createsf', createSeatFlight);
seatsRouter.get('/createsfbyid', createSeatFlightById);
seatsRouter.get('/getallsf', getAllSeatsWithAllFlightId);
seatsRouter.get('/getallsf/:id', getAllSeatsByFlightId);
seatsRouter.get('/getallsb/:id', getAllSeatsByBookingId);
seatsRouter.patch('/updatesf', updateSeatsFlight);
seatsRouter.put('/reset-seats/:flightId', resetSeatsStatus);
seatsRouter.put('/reset-all-seats', updateAllOccupiedSeatsToAvailableAndAdjustSeatsLeft);
seatsRouter.delete('/deleteall', deleteAllSeatFlights);