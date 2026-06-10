import express, { NextFunction, Request, Response } from 'express';
import { flightRouter } from './flight.router';
import { bookingRouter } from './booking.router';
import { authRouter } from './auth.router';
import { userRouter } from './user.router';
import { passengersRouter } from './passengers.router';
import { clientuserRouter } from './client.router';
import { meRouter } from './me.router';
import { agencyRouter, agentRouter } from './agencyAgent.router';
import {
  announcementRouter,
  announcementTemplateRouter
} from './announcementRoute';
import { seatsRouter } from './seatsRoute';
import { CardsRouter } from '../dashboardCardsRouter';
import { refundRouter } from './refund.route';
import { notificationRouter } from './notification.router';
import supportTicketRouter from './supportTicket.router';

const AdminRouter = express.Router();

// Admin routes
AdminRouter.get('/admin', (_req: Request, res: Response) => {
  console.log('GET request received');
  res.send('Admin panel');
});

// Use the flightRouter for routes related to flights
AdminRouter.use('/booking', bookingRouter);
AdminRouter.use('/refund', refundRouter);
AdminRouter.use('/flight', flightRouter);
AdminRouter.use('/auth', authRouter);
AdminRouter.use('/user', userRouter);
AdminRouter.use('/passenger', passengersRouter);
AdminRouter.use('/agency', agencyRouter);
AdminRouter.use('/agent', agentRouter);
AdminRouter.use('/clientuser', clientuserRouter);
AdminRouter.use('/announcement/templates', announcementTemplateRouter);
AdminRouter.use('/announcement', announcementRouter);
AdminRouter.use('/notification', notificationRouter);
AdminRouter.use('/support-tickets', supportTicketRouter);
AdminRouter.use('/seats', seatsRouter);
AdminRouter.use('/cards', CardsRouter);
AdminRouter.use('/me', meRouter);

export default AdminRouter;
