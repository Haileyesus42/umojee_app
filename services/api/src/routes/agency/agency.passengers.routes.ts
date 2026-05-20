import express from 'express';

import { Agency_clientGetAllUsers, Agency_DeletePassengers, Agency_TogglePassengerStatus } from '../../controller/agency/passengers.controller';

export const agencyPassengersRouter = express.Router();


agencyPassengersRouter.get('/getall', Agency_clientGetAllUsers);
agencyPassengersRouter.patch('/toggleStatus', Agency_TogglePassengerStatus);
agencyPassengersRouter.delete('/delete', Agency_DeletePassengers);
