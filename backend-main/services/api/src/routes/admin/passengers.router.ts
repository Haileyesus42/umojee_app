import express from 'express';

import {
  clientGetAllUsers,
  DeletePassengers,
  TogglePassengerStatus
} from '../../controller/admin/passengers.controller';

export const passengersRouter = express.Router();


passengersRouter.get('/getall', clientGetAllUsers);
passengersRouter.patch('/toggleStatus', TogglePassengerStatus);
passengersRouter.delete('/delete', DeletePassengers);
