import express from 'express';
import { AIgetCheckoutSession, getBookingByReferenceNumber, getCheckoutSession } from '../../controller/AI_Bot/booking.controller';
import { getFlightsByAirports } from '../../controller/AI_Bot/flight.controller';
import { AIgetAllUsers, AIGetUserBookingHistory, AIGetUserById, AIUpdateUserPreferences, UpdateUserThreadId } from '../../controller/AI_Bot/user.controller';
import { Clientprotect } from '../../controller/client/authController';

export const aiRouter = express.Router(); // Define a separate router for flight routes
// aiRouter.post('/booking/checkout-session', getCheckoutSession);
// aiRouter.post('/booking/checkout-session', Clientprotect, AIgetCheckoutSession);
aiRouter.post('/booking/checkout-session/:userId', AIgetCheckoutSession);
aiRouter.get('/booking/get/reference', getBookingByReferenceNumber);
aiRouter.get('/flight/get/airports', getFlightsByAirports);

aiRouter.get('/user/getall', AIgetAllUsers)
// aiRouter.get('/user/get', Clientprotect, AIGetUserById)
aiRouter.get('/user/get/:id', AIGetUserById)
// aiRouter.patch('/user/preferences/update', Clientprotect, AIUpdateUserPreferences)
aiRouter.patch('/user/preferences/update/:userId', AIUpdateUserPreferences)
// aiRouter.get('/user/booking/history', Clientprotect, AIGetUserBookingHistory)
aiRouter.get('/user/booking/history/:userId', AIGetUserBookingHistory)

aiRouter.patch('/user/update/thread/:userId', UpdateUserThreadId)