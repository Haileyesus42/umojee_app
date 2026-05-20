import express from 'express';

import { AdmingetAllUsers } from '../../controller/admin/adminuser.controller';
import {
  AdminAdduser,
  AdminDeleteUser,
  AdminGetUser,
  AdminUpdateuser,
  DeleteManyUsers,
  ToggleUserStatus
} from '../../controller/admin/user.controller';

export const userRouter = express.Router(); // Define a separate router for flight routes

userRouter.post('/add', AdminAdduser);
userRouter.get('/getall', AdmingetAllUsers);
userRouter.get('/get', AdminGetUser);
userRouter.patch('/update', AdminUpdateuser);
userRouter.patch('/toggleStatus', ToggleUserStatus);
userRouter.delete('/delete/:id', AdminDeleteUser);
userRouter.delete('/deleteMany', DeleteManyUsers);
