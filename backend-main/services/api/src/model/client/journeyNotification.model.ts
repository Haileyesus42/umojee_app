import mongoose, { Document, Schema } from "mongoose";

export interface IJourneyNotification extends Document {
  userId: mongoose.Types.ObjectId;
  journeyId: string;
  notificationId: string;
  priority: "info" | "reminder" | "action_required" | "warning";
  title: string;
  message: string;
  monitoringType?: string;
  seen: boolean;
  dismissed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const journeyNotificationSchema = new Schema<IJourneyNotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "ClientUser",
      required: [true, "userId is required"],
      index: true,
    },
    journeyId: {
      type: String,
      required: [true, "journeyId is required"],
      index: true,
    },
    notificationId: {
      type: String,
      required: [true, "notificationId is required"],
    },
    priority: {
      type: String,
      enum: ["info", "reminder", "action_required", "warning"],
      default: "info",
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    monitoringType: { type: String },
    seen: { type: Boolean, default: false },
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One notification per user per journey per notificationId
journeyNotificationSchema.index(
  { userId: 1, journeyId: 1, notificationId: 1 },
  { unique: true }
);

const JourneyNotification = mongoose.model<IJourneyNotification>(
  "JourneyNotification",
  journeyNotificationSchema
);

export default JourneyNotification;
