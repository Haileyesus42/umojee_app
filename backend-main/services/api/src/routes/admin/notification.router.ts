import { AdminProtect } from '../../controller/admin/authController';
import { deleteAllNotifications, getAllNotifications, getAllNotificationsn, updateNotificationSeen } from '../../controller/admin/notification/notification.controller';
import express from 'express';

export const notificationRouter = express.Router()
notificationRouter.get('/getall', AdminProtect, getAllNotifications)
notificationRouter.get('/getall/all', getAllNotificationsn)
notificationRouter.patch('/update/:id', AdminProtect, updateNotificationSeen)
notificationRouter.delete('/deleteall', deleteAllNotifications);
