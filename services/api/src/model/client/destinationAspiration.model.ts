import mongoose, { Document, Schema } from "mongoose";

export interface IDestinationAspiration extends Document {
  userId: mongoose.Types.ObjectId;
  placeId: string;
  place: Record<string, any>;
  source?: string;
  createdAt: Date;
  updatedAt: Date;
}

const destinationAspirationSchema = new Schema<IDestinationAspiration>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "ClientUser",
      required: [true, "userId is required"],
      index: true,
    },
    placeId: {
      type: String,
      required: [true, "placeId is required"],
      index: true,
    },
    place: {
      type: Schema.Types.Mixed,
      required: [true, "place is required"],
    },
    source: { type: String, default: "destination_recommendation" },
  },
  { timestamps: true }
);

destinationAspirationSchema.index({ userId: 1, placeId: 1 }, { unique: true });
destinationAspirationSchema.index({ userId: 1, createdAt: -1 });

const DestinationAspiration = mongoose.model<IDestinationAspiration>(
  "DestinationAspiration",
  destinationAspirationSchema
);

DestinationAspiration.syncIndexes().catch((err) =>
  console.warn("DestinationAspiration syncIndexes:", err.message)
);

export default DestinationAspiration;
