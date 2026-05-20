import { Request, Response } from "express";
import JourneyNotification from "../../model/client/journeyNotification.model";
import { emitNotificationToUser } from "../../middleware/notificationSocket";
import { fetchJourneyRecord } from "../../middleware/journeyShareAccess";

function getJourneyPreviewImage(journey: any): string {
  const bookedFlights = Array.isArray(journey?.booked_flights) ? journey.booked_flights : [];
  const savedFlights = Array.isArray(journey?.saved_flights) ? journey.saved_flights : [];
  const flight = bookedFlights[0] || savedFlights[0] || null;
  if (!flight || typeof flight !== "object") return "";

  const directImage =
    flight.imageUrl ||
    flight.image_url ||
    flight.airline_image ||
    flight.airline_logo ||
    (Array.isArray(flight.imageUrls) ? flight.imageUrls[0] : undefined) ||
    (Array.isArray(flight.image_urls) ? flight.image_urls[0] : undefined);

  return typeof directImage === "string" ? directImage : "";
}

/**
 * POST /api/client/journey-notifications
 * Create or update a journey notification (upsert by notificationId).
 */
export const upsertNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { journeyId, notificationId, priority, title, message, monitoringType } = req.body;

    if (!journeyId || !notificationId || !title || !message) {
      return res.status(400).json({
        status: "fail",
        message: "journeyId, notificationId, title, and message are required",
      });
    }

    const doc = await JourneyNotification.findOneAndUpdate(
      { userId, journeyId, notificationId },
      { userId, journeyId, notificationId, priority: priority || "info", title, message, monitoringType },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const journey = await fetchJourneyRecord(journeyId).catch(() => null);
    emitNotificationToUser(String(userId), {
      event: "client_notification",
      data: {
        _id: String(doc._id),
        title,
        message,
        route: `/journey/${encodeURIComponent(journeyId)}`,
        type: "journey_live",
        seen: Boolean(doc.seen),
        createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString(),
        journeyId,
        imageUrl: getJourneyPreviewImage(journey),
        metadata: {
          notificationId,
          priority: priority || "info",
          monitoringType: monitoringType || "",
          source: "journey_notification",
        },
        actor: null,
      },
    });

    return res.status(201).json({ status: "success", data: doc });
  } catch (error: any) {
    console.error("upsertNotification error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * POST /api/client/journey-notifications/bulk
 * Create or update multiple journey notifications at once.
 */
export const bulkUpsertNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { journeyId, notifications } = req.body;

    if (!journeyId || !Array.isArray(notifications) || notifications.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "journeyId and notifications array are required",
      });
    }

    const ops = notifications.map((n: any) => ({
      updateOne: {
        filter: { userId, journeyId, notificationId: n.notificationId || n.id },
        update: {
          $set: {
            userId,
            journeyId,
            notificationId: n.notificationId || n.id,
            priority: n.priority || "info",
            title: n.title,
            message: n.message,
            monitoringType: n.monitoringType,
          },
          $setOnInsert: { seen: false, dismissed: false },
        },
        upsert: true,
      },
    }));

    await JourneyNotification.bulkWrite(ops);

    const journey = await fetchJourneyRecord(journeyId).catch(() => null);
    const imageUrl = getJourneyPreviewImage(journey);

    notifications.forEach((notification: any) => {
      emitNotificationToUser(String(userId), {
        event: "client_notification",
        data: {
          _id: `${journeyId}:${notification.notificationId || notification.id}`,
          title: notification.title,
          message: notification.message,
          route: `/journey/${encodeURIComponent(journeyId)}`,
          type: "journey_live",
          seen: false,
          createdAt: new Date().toISOString(),
          journeyId,
          imageUrl,
          metadata: {
            notificationId: notification.notificationId || notification.id,
            priority: notification.priority || "info",
            monitoringType: notification.monitoringType || "",
            source: "journey_notification_bulk",
          },
          actor: null,
        },
      });
    });

    return res.status(201).json({ status: "success", message: `${notifications.length} notifications saved` });
  } catch (error: any) {
    console.error("bulkUpsertNotifications error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * GET /api/client/journey-notifications/:journeyId
 * Fetch all non-dismissed notifications for a journey.
 */
export const getNotificationsByJourney = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { journeyId } = req.params;

    const docs = await JourneyNotification.find({ userId, journeyId, dismissed: false })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({ status: "success", data: docs });
  } catch (error: any) {
    console.error("getNotificationsByJourney error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * PATCH /api/client/journey-notifications/:journeyId/dismiss/:notificationId
 * Dismiss a single notification.
 */
export const dismissNotification = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { journeyId, notificationId } = req.params;

    await JourneyNotification.findOneAndUpdate(
      { userId, journeyId, notificationId },
      { dismissed: true }
    );

    return res.status(200).json({ status: "success" });
  } catch (error: any) {
    console.error("dismissNotification error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};

/**
 * PATCH /api/client/journey-notifications/:journeyId/dismiss-all
 * Dismiss all notifications for a journey.
 */
export const dismissAllNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ status: "fail", message: "Not authenticated" });
    }

    const { journeyId } = req.params;

    await JourneyNotification.updateMany(
      { userId, journeyId, dismissed: false },
      { dismissed: true }
    );

    return res.status(200).json({ status: "success" });
  } catch (error: any) {
    console.error("dismissAllNotifications error:", error);
    return res.status(500).json({ status: "fail", message: error.message });
  }
};
