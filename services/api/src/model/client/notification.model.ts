import mongoose from "mongoose";

export type ClientNotificationType =
    | "general"
    | "message_received"
    | "friend_request_received"
    | "friend_request_accepted"
    | "journey_shared"
    | "journey_live";

export interface ClientNotificationDocument extends mongoose.Document {
    title?: string;
    message: string;
    route: string;
    type: ClientNotificationType;
    journeyId?: string;
    imageUrl?: string;
    metadata?: Record<string, any>;
    actor?: {
        user?: mongoose.Schema.Types.ObjectId | null;
        name?: string;
        photo?: string | null;
    };
    notifier: mongoose.Schema.Types.ObjectId;
    notifiedTo: Array<mongoose.Schema.Types.ObjectId>;
    createdAt: Date;
    updatedAt: Date;
}

const ClientNotificationSchema = new mongoose.Schema<ClientNotificationDocument>(
    {
        title: {
            type: String,
            default: "",
        },
        message: {
            type: String,
            required: [true, "Notification must have a message!"],
        },
        route: {
            type: String,
            // required: [true, "Notification must have a route!"],
        },
        type: {
            type: String,
            enum: [
                "general",
                "message_received",
                "friend_request_received",
                "friend_request_accepted",
                "journey_shared",
                "journey_live",
            ],
            default: "general",
        },
        journeyId: {
            type: String,
        },
        imageUrl: {
            type: String,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: undefined,
        },
        actor: {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "ClientUser",
                default: null,
            },
            name: {
                type: String,
                default: "",
            },
            photo: {
                type: String,
                default: null,
            },
        },
        notifier: {
            type: mongoose.Schema.Types.ObjectId,
            // ref: "AdminUser",
            required: [true, "Notification must have a notifier!"],
        },
        notifiedTo: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "ClientUser",
                    required: true,
                },
                seen: {
                    type: Boolean,
                    default: false,
                },
            },
        ],
    },
    { timestamps: true }
);

const ClientNotificationModel = mongoose.model<ClientNotificationDocument>("ClientNotification", ClientNotificationSchema);

export default ClientNotificationModel;
