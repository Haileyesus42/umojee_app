import { RestrictTo } from '../../controller/admin/authController';
import {
  createFlight,
  getFlight,
  getAllFlight,
  updateFlight,
  archiveFlight,
  getAllArchiveFlight,
  deleteFlight,
  deleteManyFlights,
  cancelFlight,
  searchFlights,
  getAllFlightFiltered
} from '../../controller/admin/flight.controller';
import express from 'express';
import { Role } from '../../types';

export const flightRouter = express.Router(); // Define a separate router for flight routes

// Flight routes
// flightRouter.post('/create', restrictTo(Role.SuperAdmin), createFlight);
flightRouter.post('/create', createFlight);
flightRouter.get('/getall', getAllFlight);
flightRouter.get('/getall/archive', getAllArchiveFlight);
flightRouter.get('/get', getFlight);
flightRouter.get('/search-flights', searchFlights); // Not being used
flightRouter.get('/getallF', getAllFlightFiltered); // Not being used
flightRouter.patch('/update', updateFlight);
// flightRouter.patch('/archive', restrictTo(Role.SuperAdmin), archiveFlight);
flightRouter.patch('/archive', archiveFlight);
flightRouter.patch('/cancel', cancelFlight);
// flightRouter.get('/getall/archive', restrictTo(Role.SuperAdmin), getAllArchiveFlight);
// flightRouter.get('/delete', restrictTo(Role.SuperAdmin), deleteFlight);
flightRouter.delete('/deleteMany', deleteManyFlights);
flightRouter.delete('/delete', deleteFlight);

// flightRouter.get('/deleteMany', restrictTo(Role.SuperAdmin), deleteManyFlights);
