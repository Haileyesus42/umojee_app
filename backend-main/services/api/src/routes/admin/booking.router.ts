import express from 'express';

import {
  getAllBooking,
  getBooking,
  getCheckoutSession,
  deleteBooking,
  deleteManyBookings,
  getAllPassengers,
  deleteAllBookings,
  updateBooking,
  updatePassengerInformation,
  updateLuggages,
  bookingCheckIn,
} from '../../controller/admin/booking.controller';

export const bookingRouter = express.Router();
bookingRouter.post("/checkout-session", getCheckoutSession);
bookingRouter.get('/getall', getAllBooking);
bookingRouter.get('/passengers', getAllPassengers);
bookingRouter.get('/get', getBooking);
bookingRouter.put("/update", updateBooking);
bookingRouter.patch("/update/passengers/information/:id", updatePassengerInformation);
bookingRouter.patch("/update/luggage/:id", updateLuggages);
bookingRouter.patch("/update/checkin", bookingCheckIn);
bookingRouter.delete('/delete/:bookingId', deleteBooking);
bookingRouter.delete('/deleteMany', deleteManyBookings);
bookingRouter.delete('/deleteall', deleteAllBookings);


