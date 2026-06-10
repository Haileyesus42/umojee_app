import express from "express";
import { Clientprotect } from "../../controller/client/authController";
import {
  upsertNotification,
  bulkUpsertNotifications,
  getNotificationsByJourney,
  dismissNotification,
  dismissAllNotifications,
} from "../../controller/client/journeyNotification.controller";

const journeyNotificationRouter = express.Router();

journeyNotificationRouter.post("/", Clientprotect, upsertNotification);
journeyNotificationRouter.post("/bulk", Clientprotect, bulkUpsertNotifications);
journeyNotificationRouter.get("/:journeyId", Clientprotect, getNotificationsByJourney);
journeyNotificationRouter.patch("/:journeyId/dismiss/:notificationId", Clientprotect, dismissNotification);
journeyNotificationRouter.patch("/:journeyId/dismiss-all", Clientprotect, dismissAllNotifications);

export default journeyNotificationRouter;
