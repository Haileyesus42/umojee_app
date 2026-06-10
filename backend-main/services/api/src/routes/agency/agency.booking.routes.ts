import express from "express";
import { Agency_bookingCheckIn, Agency_deleteBooking, Agency_deleteManyBookings, Agency_getAllBooking, Agency_getCheckoutSession, Agency_updateBooking, Agency_updateLuggages, Agency_updatePassengerInformation } from "../../controller/agency/booking.controller";
export const agencyBookingRouter = express.Router();

agencyBookingRouter.post("/checkout-session", Agency_getCheckoutSession);
agencyBookingRouter.get("/getall", Agency_getAllBooking);
agencyBookingRouter.patch("/update", Agency_updateBooking);
agencyBookingRouter.patch("/update/passenger/:id", Agency_updatePassengerInformation);
agencyBookingRouter.patch("/update/luggage/:id", Agency_updateLuggages);
agencyBookingRouter.patch("/update/checkin/:id", Agency_bookingCheckIn);
agencyBookingRouter.delete("/delete/:id", Agency_deleteBooking);
agencyBookingRouter.delete("/deleteMany", Agency_deleteManyBookings);