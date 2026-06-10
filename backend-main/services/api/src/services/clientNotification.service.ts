import ClientNotificationModel, {
  ClientNotificationType,
} from "../model/client/notification.model";
import { emitNotificationToUser } from "../middleware/notificationSocket";

type NotificationActorInput = {
  userId?: string | null;
  name?: string;
  photo?: string | null;
};

type CreateClientNotificationInput = {
  notifierId: string;
  notifiedUserIds: string[];
  title?: string;
  message: string;
  route?: string;
  type?: ClientNotificationType;
  journeyId?: string;
  imageUrl?: string;
  metadata?: Record<string, any>;
  actor?: NotificationActorInput;
};

function normalizeUserIds(userIds: string[]) {
  return Array.from(new Set(userIds.map((id) => String(id).trim()).filter(Boolean)));
}

export async function createClientNotification(input: CreateClientNotificationInput) {
  const notifiedUserIds = normalizeUserIds(input.notifiedUserIds);
  if (!notifiedUserIds.length) return null;

  const doc = await ClientNotificationModel.create({
    title: input.title || "",
    message: input.message,
    route: input.route || "",
    type: input.type || "general",
    journeyId: input.journeyId,
    imageUrl: input.imageUrl,
    metadata: input.metadata,
    actor: input.actor
      ? {
          user: input.actor.userId || null,
          name: input.actor.name || "",
          photo: input.actor.photo || null,
        }
      : undefined,
    notifier: input.notifierId,
    notifiedTo: notifiedUserIds.map((userId) => ({
      user: userId,
      seen: false,
    })),
  });

  const createdAt =
    doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date().toISOString();

  for (const userId of notifiedUserIds) {
    emitNotificationToUser(String(userId), {
      event: "client_notification",
      data: {
        _id: String(doc._id),
        title: doc.title || "",
        message: doc.message,
        route: doc.route || "",
        type: doc.type || "general",
        seen: false,
        createdAt,
        journeyId: doc.journeyId || "",
        imageUrl: doc.imageUrl || "",
        metadata: doc.metadata || {},
        actor: doc.actor
          ? {
              userId: doc.actor.user ? String(doc.actor.user) : "",
              name: doc.actor.name || "",
              photo: doc.actor.photo || "",
            }
          : null,
      },
    });
  }

  return doc;
}
